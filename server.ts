import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client as NotionClient } from '@notionhq/client';
import { Octokit } from '@octokit/rest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to fetch from LeetCode GraphQL
  const fetchLeetCode = async (query: string, variables: any, sessionCookie?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    };
    if (sessionCookie) {
      headers['Cookie'] = `LEETCODE_SESSION=${sessionCookie}`;
    }

    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      throw new Error(`LeetCode API error: ${res.statusText}`);
    }
    return res.json();
  };

  app.post('/api/sync', async (req, res) => {
    const {
      leetcodeUsername,
      leetcodeSession,
      notionToken,
      notionDbId,
      githubToken,
      githubRepo,
      syncToNotion,
      syncToGithub,
      syncMode, // 'all' or 'recent'
      forceUpdate
    } = req.body;

    const logs: string[] = [];
    const log = (msg: string) => {
      console.log(msg);
      logs.push(msg);
    };

    try {
      if (!leetcodeUsername) {
        return res.status(400).json({ error: 'LeetCode Username is required' });
      }

      let submissions: any[] = [];
      const isSyncAll = syncMode === 'all';

      if (isSyncAll) {
        if (!leetcodeSession) {
          return res.status(400).json({ error: 'LeetCode Session Cookie is required to sync all past submissions.' });
        }
        log(`[LeetCode] Fetching ALL AC submissions for ${leetcodeUsername}... This might take a while.`);
        const ALL_SUB_QUERY = `query submissionList($offset: Int!, $limit: Int!) {
          submissionList(offset: $offset, limit: $limit) {
            hasNext
            submissions {
              id
              title
              titleSlug
              statusDisplay
              lang
              timestamp
            }
          }
        }`;

        let offset = 0;
        let limit = 20;
        let hasNext = true;
        while (hasNext) {
          log(`[LeetCode] Fetching submissions offset ${offset}...`);
          
          const recentData = await fetchLeetCode(ALL_SUB_QUERY, { offset, limit }, leetcodeSession);
          
          if (!recentData || !recentData.data) {
             throw new Error(`LeetCode GraphQL API error or invalid response.`);
          }
          
          const pageSubs = recentData.data.submissionList?.submissions || [];
          if (pageSubs.length === 0) {
            hasNext = false;
            break;
          }
          
          const acSubs = pageSubs.filter((s: any) => s.statusDisplay === 'Accepted').map((s: any) => ({
            id: s.id,
            title: s.title,
            titleSlug: s.titleSlug,
            timestamp: s.timestamp,
            statusDisplay: s.statusDisplay,
            lang: s.lang
          }));
          submissions.push(...acSubs);
          
          if (!recentData.data.submissionList?.hasNext) {
            hasNext = false;
          }
          offset += limit;
          // small delay to prevent rate limiting
          await new Promise(r => setTimeout(r, 500));
        }
        log(`[LeetCode] Successfully fetched ${submissions.length} total AC submissions.`);
      } else {
        log(`[LeetCode] Fetching recent AC submissions for ${leetcodeUsername}...`);
        
        const RECENT_SUB_QUERY = `query recentAcSubmissions($username: String!, $limit: Int!) {
          recentAcSubmissionList(username: $username, limit: $limit) {
            id
            title
            titleSlug
            timestamp
            statusDisplay
            lang
          }
        }`;
        const recentData = await fetchLeetCode(RECENT_SUB_QUERY, { username: leetcodeUsername, limit: 20 }, leetcodeSession);
        submissions = recentData?.data?.recentAcSubmissionList || [];
        
        log(`[LeetCode] Found ${submissions.length} recent AC submissions.`);
      }

      if (!submissions || submissions.length === 0) {
        log('No recent submissions found.');
        return res.json({ logs });
      }

      // Setup Notion if checked
      let notion: NotionClient | null = null;
      let existingNotTitles = new Map<string, string>(); // title -> pageId

      let existingSubmissionIds = new Map<string, string>(); // submissionId -> pageId
      let notionDbSchema: any = null;

      if (syncToNotion && notionToken && notionDbId) {
        log('[Notion] Initializing Notion client...');
        notion = new NotionClient({ auth: notionToken });
        
        try {
          notionDbSchema = await notion.databases.retrieve({ database_id: notionDbId });
        } catch(e) {
          log('[Notion] Failed to fetch database schema, proceeding anyway.');
        }

        log(`[Notion] Fetching existing entries in database ${notionDbId}...`);
        try {
          // Fetch existing pages to prevent duplicates
          let hasMore = true;
          let nextCursor = undefined;
          let count = 0;
          while (hasMore) {
              const dbResponse: any = await notion.databases.query({ 
                  database_id: notionDbId,
                  start_cursor: nextCursor
              });
              
              (dbResponse.results as any[]).forEach(page => {
                const subIdProp = page.properties?.['Submission ID'];
                if (subIdProp?.rich_text?.[0]?.plain_text) {
                    existingSubmissionIds.set(subIdProp.rich_text[0].plain_text, page.id);
                }
                
                const titleProp = page.properties?.Name?.title || page.properties?.Title?.title || page.properties?.title?.title || page.properties?.Problem?.title;
                if (titleProp && titleProp.length > 0) {
                  existingNotTitles.set(titleProp[0].plain_text, page.id);
                }
              });

              nextCursor = dbResponse.next_cursor;
              hasMore = dbResponse.has_more;
              count += dbResponse.results.length;
          }
          log(`[Notion] Found ${count} existing entries. (${existingSubmissionIds.size} with Submission IDs)`);
        } catch (error: any) {
             throw new Error(`Notion error: ${error.message}. Please check your DB ID and Integration permissions.`);
        }
      }

      // Deduplicate internally within the fetched submissions
      const uniqueSubmissions = submissions.filter((sub: any, index: number, self: any[]) => 
        index === self.findIndex((s) => String(s.id) === String(sub.id))
      );

      // Filter against Notion
      const parsedSubmissions = uniqueSubmissions.filter((sub: any) => {
        const subIdStr = String(sub.id);
        
        let existingPageId = existingSubmissionIds.get(subIdStr);
        if (!existingPageId && existingSubmissionIds.size === 0 && existingNotTitles.has(sub.title)) {
           existingPageId = existingNotTitles.get(sub.title);
        }
        
        if (existingPageId) {
            sub.existingPageId = existingPageId; // attach page ID for later update
            if (!forceUpdate) {
               return false; // Skip, exact submission already exists
            }
        }
        
        return true;
      });

      if (parsedSubmissions.length === 0) {
        log('No new solves to sync. All caught up!');
        return res.json({ logs });
      }

      log(`Found ${parsedSubmissions.length} solve(s) to process.`);
      const QUESTION_QUERY = `query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          title
          titleSlug
          difficulty
          topicTags { name }
        }
      }`;

      // Initialize GitHub if configured
      let octokit: Octokit | null = null;
      let repoOwner = '';
      let repoName = '';
    
      if (syncToGithub && githubToken && githubRepo) {
        log('[GitHub] Initializing GitHub client...');
        octokit = new Octokit({ auth: githubToken });
        const parts = githubRepo.split('/');
        if (parts.length === 2) {
          repoOwner = parts[0];
          repoName = parts[1];
        } else {
             throw new Error("Invalid GitHub Repo format. Expected owner/repo.");
        }
      }

      for (const sub of parsedSubmissions) {
        log(`[LeetCode] Fetching details for ${sub.title}...`);
        
        let details: any = {};
        try {
            const qData = await fetchLeetCode(QUESTION_QUERY, { titleSlug: sub.titleSlug }, leetcodeSession);
            details = qData?.data?.question || {};
        } catch (e) {
            log(`Failed to fetch details for ${sub.title}, proceeding with basic info.`);
        }

        // Notion
        if (notion) {
          let tags: any[] = [];
          let properties: any = {};
          try {
            log(`[Notion] Creating entry for ${sub.title}...`);
            
            // Format tags
            tags = (details.topicTags || []).map((t: any) => ({ name: t.name }));

            properties = {
                'Name': {
                  title: [ { text: { content: sub.title } } ]
                },
                'Difficulty': {
                  select: { name: details.difficulty || 'Unknown' }
                },
                'Platform': {
                  select: { name: 'LeetCode' }
                },
                'Language': {
                    select: { name: sub.lang || 'Unknown' }
                },
                'URL': {
                    url: `https://leetcode.com/submissions/detail/${sub.id}/`
                },
                'LeetCode Link': {
                    url: `https://leetcode.com/problems/${sub.titleSlug}/`
                },
                'Submission ID': {
                    rich_text: [ { text: { content: String(sub.id || '') } } ]
                }
            };

            const probNumSchema = notionDbSchema?.properties?.['Problem Number'];
            if (probNumSchema?.type === 'number') {
                properties['Problem Number'] = { number: parseInt(details.questionId) || 0 };
            } else {
                properties['Problem Number'] = { rich_text: [ { text: { content: String(details.questionId || '') } } ] };
            }

            if (syncToGithub && repoOwner && repoName) {
                 const ext = sub.lang === 'python3' ? 'py' : sub.lang === 'java' ? 'java' : sub.lang === 'cpp' ? 'cpp' : sub.lang === 'javascript' ? 'js' : sub.lang === 'typescript'? 'ts' : 'txt';
                 const path = `LeetCode/${details.difficulty || 'Unknown'}/${sub.titleSlug}.${ext}`;
                 properties['GitHub Link'] = { url: `https://github.com/${repoOwner}/${repoName}/blob/main/${path}` };
            }

            // Pre-fill Status to Completed 
            const statusSchema = notionDbSchema?.properties?.['Status'];
            if (statusSchema?.type === 'status') {
                // If the user's DB uses standard Notion status
                // We map to "Done", but if the user has custom statuses this could still fail
                // In which case they need to configure it correctly in Notion
                properties['Status'] = { status: { name: 'Accepted' } };
            } else {
                properties['Status'] = { select: { name: 'Completed' } };
            }

            // Add Tags and Topics if available
            if (tags.length > 0) {
                properties['Tags'] = { multi_select: tags };
                properties['Topics'] = { multi_select: tags };
                
                const patternSchema = notionDbSchema?.properties?.['Pattern'];
                if (patternSchema?.type === 'select') {
                    properties['Pattern'] = { select: tags[0] };
                } else {
                    properties['Pattern'] = { multi_select: tags };
                }
            }

            // Convert LeetCode timestamp (seconds) to ISO string for Notion Date
            if (sub.timestamp) {
                const dateIso = new Date(parseInt(sub.timestamp) * 1000).toISOString();
                properties['Date'] = { date: { start: dateIso } };
                properties['Date Solved'] = { date: { start: dateIso } };
            }

            if (sub.existingPageId) {
               await notion.pages.update({
                  page_id: sub.existingPageId,
                  properties
               });
               log(`[Notion] Successfully updated ${sub.title}`);
            } else {
               await notion.pages.create({
                 parent: { database_id: notionDbId },
                 properties
               });
               log(`[Notion] Successfully created ${sub.title}`);
            }
          } catch(e: any) {
              const errorMsg = e.message || '';
              if (errorMsg.includes('Status is expected to be status')) {
                  log(`[Notion] Status type mismatch for ${sub.title}, retrying with "status" type...`);
                  properties['Status'] = { status: { name: 'Accepted' } };
                  if (sub.existingPageId) {
                      await notion.pages.update({ page_id: sub.existingPageId, properties });
                      log(`[Notion] Successfully updated ${sub.title}`);
                  } else {
                      await notion.pages.create({ parent: { database_id: notionDbId }, properties });
                      log(`[Notion] Successfully created ${sub.title}`);
                  }
              } else if (errorMsg.includes('Status is expected to be select')) {
                  log(`[Notion] Status type mismatch for ${sub.title}, retrying with "select" type...`);
                  properties['Status'] = { select: { name: 'Completed' } };
                  if (sub.existingPageId) {
                      await notion.pages.update({ page_id: sub.existingPageId, properties });
                      log(`[Notion] Successfully updated ${sub.title}`);
                  } else {
                      await notion.pages.create({ parent: { database_id: notionDbId }, properties });
                      log(`[Notion] Successfully created ${sub.title}`);
                  }
              } else if (errorMsg.includes('Pattern is expected to be select')) {
                  log(`[Notion] Pattern type mismatch for ${sub.title}, retrying with "select" type...`);
                  if (tags.length > 0) {
                      properties['Pattern'] = { select: tags[0] };
                  } else {
                      delete properties['Pattern'];
                  }
                  if (sub.existingPageId) {
                      await notion.pages.update({ page_id: sub.existingPageId, properties });
                      log(`[Notion] Successfully updated ${sub.title}`);
                  } else {
                      await notion.pages.create({ parent: { database_id: notionDbId }, properties });
                      log(`[Notion] Successfully created ${sub.title}`);
                  }
              } else {
                  log(`[Notion] Error creating property for ${sub.title}: ${errorMsg}. Did you update your schema?`);
                  throw e;
              }
          }
        }

        // GitHub
        if (octokit) {
             const ext = sub.lang === 'python3' ? 'py' : sub.lang === 'java' ? 'java' : sub.lang === 'cpp' ? 'cpp' : sub.lang === 'javascript' ? 'js' : sub.lang === 'typescript'? 'ts' : sub.lang === 'c' ? 'c' : sub.lang === 'csharp' ? 'cs' : sub.lang === 'swift' ? 'swift' : sub.lang === 'golang' ? 'go' : sub.lang === 'ruby' ? 'rb' : sub.lang === 'scala' ? 'scala' : sub.lang === 'kotlin' ? 'kt' : sub.lang === 'rust' ? 'rs' : sub.lang === 'php' ? 'php' : 'txt';
             const path = `LeetCode/${details.difficulty || 'Unknown'}/${sub.titleSlug}.${ext}`;
             log(`[GitHub] Pushing ${path}...`);
             
             let submissionCode = `// Title: ${sub.title}\n// URL: https://leetcode.com/problems/${sub.titleSlug}/\n// Difficulty: ${details.difficulty}\n// Language: ${sub.lang}\n\n// Add your solution here!`;
             
             try {
                // Fetch actual code if session is available
                if (leetcodeSession && sub.id) {
                    const SUB_DETAILS_QUERY = `query submissionDetails($submissionId: Int!) {
                      submissionDetails(submissionId: $submissionId) {
                        code
                      }
                    }`;
                    log(`[LeetCode] Fetching code for submission ${sub.id}...`);
                    const codeData = await fetchLeetCode(SUB_DETAILS_QUERY, { submissionId: parseInt(sub.id) }, leetcodeSession);
                    if (codeData?.data?.submissionDetails?.code) {
                        submissionCode = `// Title: ${sub.title}\n// URL: https://leetcode.com/problems/${sub.titleSlug}/\n// Difficulty: ${details.difficulty}\n// Language: ${sub.lang}\n\n${codeData.data.submissionDetails.code}`;
                    }
                }
             } catch(e) {
                 log(`[LeetCode] Failed to fetch code for ${sub.title}, using template.`);
             }

             try {
                // check if exists to get sha for update, simple mode creates if not exist
                let sha = undefined;
                try {
                     const existing = await octokit.repos.getContent({
                         owner: repoOwner,
                         repo: repoName,
                         path: path
                     });
                     if (existing.data && !Array.isArray(existing.data) && existing.data.sha) {
                         // File already exists! We skip to avoid overwriting unless forceUpdate is true.
                         if (!forceUpdate) {
                             log(`[GitHub] File ${path} already exists. Skipping.`);
                             continue;
                         }
                         sha = existing.data.sha;
                     }
                } catch(e) {}
                 
                await octokit.repos.createOrUpdateFileContents({
                   owner: repoOwner,
                   repo: repoName,
                   path: path,
                   message: `Added sync for ${sub.title}`,
                   content: Buffer.from(submissionCode).toString('base64'),
                   sha: sha
                });
                log(`[GitHub] Successfully pushed ${sub.title}`);
             } catch(e: any) {
                 log(`[GitHub] Error pushing to ${repoName}: ${e.message}`);
             }
        }
      }

      log('Sync Complete! 🎉');
      res.json({ logs });
    } catch (e: any) {
      log(`[Error] ${e.message}`);
      res.status(500).json({ error: e.message, logs });
    }
  });


  app.post('/api/setup-notion', async (req, res) => {
    const { notionToken, notionDbId } = req.body;
    if (!notionToken || !notionDbId) return res.status(400).json({error: 'Missing Notion Token or DB ID'});

    try {
        const notion = new NotionClient({ auth: notionToken });
        const db: any = await notion.databases.retrieve({ database_id: notionDbId });
        
        const existingProps = Object.keys(db.properties);
        const missingProps: any = {};
        
        if (!existingProps.includes('Problem Number')) missingProps['Problem Number'] = { rich_text: {} };
        if (!existingProps.includes('Difficulty')) missingProps['Difficulty'] = { select: {} };
        if (!existingProps.includes('Status')) missingProps['Status'] = { select: {} };
        if (!existingProps.includes('Platform')) missingProps['Platform'] = { select: {} };
        if (!existingProps.includes('Language')) missingProps['Language'] = { select: {} };
        if (!existingProps.includes('URL')) missingProps['URL'] = { url: {} };
        if (!existingProps.includes('LeetCode Link')) missingProps['LeetCode Link'] = { url: {} };
        if (!existingProps.includes('GitHub Link')) missingProps['GitHub Link'] = { url: {} };
        if (!existingProps.includes('Tags')) missingProps['Tags'] = { multi_select: {} };
        if (!existingProps.includes('Topics')) missingProps['Topics'] = { multi_select: {} };
        if (!existingProps.includes('Pattern')) missingProps['Pattern'] = { multi_select: {} };
        if (!existingProps.includes('Companies')) missingProps['Companies'] = { multi_select: {} };
        if (!existingProps.includes('Approach')) missingProps['Approach'] = { rich_text: {} };
        if (!existingProps.includes('Time Complexity')) missingProps['Time Complexity'] = { rich_text: {} };
        if (!existingProps.includes('Space Complexity')) missingProps['Space Complexity'] = { rich_text: {} };
        if (!existingProps.includes('Mastery Level')) missingProps['Mastery Level'] = { select: {} };
        if (!existingProps.includes('Date')) missingProps['Date'] = { date: {} };
        if (!existingProps.includes('Date Solved')) missingProps['Date Solved'] = { date: {} };
        if (!existingProps.includes('Review Date')) missingProps['Review Date'] = { date: {} };
        if (!existingProps.includes('Submission ID')) missingProps['Submission ID'] = { rich_text: {} };

        if (Object.keys(missingProps).length > 0) {
            await notion.databases.update({
                database_id: notionDbId,
                properties: missingProps
            });
            return res.json({ message: 'Success! Notion DB schema updated with required properties.' });
        } else {
            return res.json({ message: 'Notion DB schema is already correct!' });
        }
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/leetcode-profile/:username', async (req, res) => {
    const { username } = req.params;
    const PROFILE_QUERY = `query userProblemsSolved($username: String!) {
      allQuestionsCount {
        difficulty
        count
      }
      matchedUser(username: $username) {
        submitStats {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
      }
    }`;
    try {
      const data = await fetchLeetCode(PROFILE_QUERY, { username });
      if (!data.data || !data.data.matchedUser) {
        return res.status(404).json({ error: 'LeetCode user not found or is inactive.' });
      }
      res.json(data.data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/test-notion', async (req, res) => {
    const { notionToken, notionDbId } = req.body;
    if (!notionToken || !notionDbId) {
      return res.status(400).json({ error: 'Missing token or database ID.' });
    }
    try {
      const notion = new NotionClient({ auth: notionToken });
      await notion.databases.retrieve({ database_id: notionDbId });
      res.json({ success: true, message: 'Successfully connected to Notion!' });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Failed to authenticate with Notion' });
    }
  });

  app.post('/api/test-github', async (req, res) => {
    const { githubToken, githubRepo } = req.body;
    if (!githubToken || !githubRepo) {
      return res.status(400).json({ error: 'Missing GitHub token or repository name.' });
    }
    try {
      const octokit = new Octokit({ auth: githubToken });
      const parts = githubRepo.split('/');
      if (parts.length !== 2) {
        return res.status(400).json({ error: 'Invalid repository name. Format must be owner/repo.' });
      }
      const [owner, repo] = parts;
      await octokit.repos.get({ owner, repo });
      res.json({ success: true, message: 'Successfully connected to GitHub repository!' });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Failed to connect to GitHub repository.' });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
