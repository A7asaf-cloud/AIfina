import { CONFIG } from '../config';
import { UserAccount, UserAppData } from '../types';

const getHeaders = () => {
  if (!CONFIG.GITHUB_TOKEN) return {};
  return {
    'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
};

async function getGithubFile(path: string): Promise<{ sha: string | null; content: any }> {
  if (!CONFIG.GITHUB_TOKEN || !CONFIG.GITHUB_REPO) {
    return { sha: null, content: null };
  }
  const url = `https://api.github.com/repos/${CONFIG.GITHUB_REPO}/contents/${path}`;
  try {
    const res = await fetch(url, { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      // Safely decode UTF-8 base64
      const decoded = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
      return { sha: data.sha, content: JSON.parse(decoded) };
    }
  } catch (e) {
    console.error(`Failed to load ${path} from GitHub:`, e);
  }
  return { sha: null, content: null };
}

async function writeGithubFile(path: string, sha: string | null, content: any): Promise<string | null> {
  if (!CONFIG.GITHUB_TOKEN || !CONFIG.GITHUB_REPO) {
    return null;
  }
  const url = `https://api.github.com/repos/${CONFIG.GITHUB_REPO}/contents/${path}`;
  const jsonStr = JSON.stringify(content, null, 2);
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
  
  const body: any = {
    message: `Database sync: update ${path}`,
    content: base64,
  };
  if (sha) {
    body.sha = sha;
  }

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      return data.content.sha;
    } else {
      const errText = await res.text();
      console.error(`Failed to write ${path} to GitHub:`, errText);
    }
  } catch (e) {
    console.error(`Failed to write file ${path} to GitHub:`, e);
  }
  return null;
}

export class GithubDbService {
  // Sync and retrieve accounts list from GitHub
  static async syncAccountsFromGithub(): Promise<UserAccount[]> {
    const { content } = await getGithubFile('database/users.json');
    if (Array.isArray(content)) {
      localStorage.setItem('fil_users_list', JSON.stringify(content));
      return content;
    }
    return [];
  }

  // Save new account to GitHub
  static async saveAccountToGithub(newAccount: UserAccount, initData: UserAppData): Promise<void> {
    try {
      const { sha, content } = await getGithubFile('database/users.json');
      const accountsList: UserAccount[] = Array.isArray(content) ? content : [];
      
      // Prevent duplicates
      const exists = accountsList.some(a => a.username.toLowerCase() === newAccount.username.toLowerCase());
      if (!exists) {
        accountsList.push(newAccount);
        const newSha = await writeGithubFile('database/users.json', sha, accountsList);
        if (newSha) {
          console.log('Users list synced to GitHub successfully');
        }
      }
      
      // Save initial user data file
      await writeGithubFile(`database/user_data_${newAccount.id}.json`, null, initData);
    } catch (e) {
      console.error('Failed to save account to GitHub:', e);
    }
  }

  // Sync user data from GitHub
  static async syncUserDataFromGithub(userId: string): Promise<UserAppData | null> {
    const { content } = await getGithubFile(`database/user_data_${userId}.json`);
    if (content && content.profile) {
      localStorage.setItem('fil_u_data_' + userId, JSON.stringify(content));
      return content;
    }
    return null;
  }

  // Save user data to GitHub in the background
  static async saveUserDataToGithub(userId: string, data: UserAppData): Promise<void> {
    try {
      const { sha } = await getGithubFile(`database/user_data_${userId}.json`);
      await writeGithubFile(`database/user_data_${userId}.json`, sha, data);
    } catch (e) {
      console.error(`Failed to sync data for user ${userId} to GitHub:`, e);
    }
  }
}
