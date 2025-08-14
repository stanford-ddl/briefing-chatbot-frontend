
// API client for backend communication
const getApiUrl = () => {
  // In Next.js, environment variables are available via process.env on both client and server
  if (typeof window !== 'undefined') {
    // Client-side - use the environment variable or fallback to localhost
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  }
  // Server-side - use the environment variable or fallback to localhost
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
};

const API_BASE_URL = getApiUrl();

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AuthResponse {
  status: number;
  msg: string;
}

export interface ChatResponse {
  status: number;
  answer: string;
}

export interface AsyncTaskResponse {
  session_id: string;
  task_id: string;
  num_steps: number;
}

export interface ProgressResponse {
  status: string;
  current_step: number;
  num_steps: number;
  progress: number;
}



export class APIClient {
  private baseURL: string;

  // 0802

  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Authenticate with access code
  async authenticate(accessCode: string): Promise<boolean> {
    //   try {
    //     const response = await fetch(`${this.baseURL}/auth`, {
    //       method: 'POST',
    //       headers: {
    //         'Content-Type': 'application/json',
    //       },
    //       credentials: 'include', // Include cookies
    //       body: JSON.stringify({
    //         access_code: accessCode
    //       })
    //     });

    //     if (response.ok) {
    //       return true;
    //     }
    //     return false;
    //   } catch (error) {
    //     console.error('Authentication error:', error);
    //     return false;
    //   }
    // }

    // 0802 改動

    const response = await fetch(`${this.baseURL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_code: accessCode })
    });
    if (!response.ok) return false;

    const { token } = await response.json() as { token: string };
    this.token = token;                        // ★ 存到實例
    return true;
  }

  private authHeaders() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }

  // --------------- 加在 APIClient class 裡 ----------------
  /** 組 Headers；若已登入就帶 Bearer JWT */
  private buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }
  // -------------------------------------------------------

  // Send a chat message (synchronous)
  async sendMessage(message: string): Promise<string> {
    //try {
    const response = await fetch(`${this.baseURL}/`, {
      method: 'POST',
      headers: this.buildHeaders(),
      // headers: {
      //   'Content-Type': 'application/json',
      //   ...this.authHeaders(),
      // },
      // credentials: 'include', // Include session cookie
      body: JSON.stringify({
        workflow: 'my_workflow',
        args: {
          query: message,
          num_steps: 1
        }
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please log in again.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ChatResponse = await response.json();
    return data.answer;
    // } catch (error) {
    //   console.error('Send message error:', error);
    //   throw error;
    //}
  }

  // Send a chat message (asynchronous with polling)
  async sendMessageAsync(message: string): Promise<string> {
    try {
      // Start the task
      const startResponse = await fetch(`${this.baseURL}/ask`, {
        method: 'POST',
        // headers: {
        //   'Content-Type': 'application/json',
        // },
        headers: this.buildHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          workflow: 'my_workflow',
          args: {
            query: message,
            num_steps: 1
          }
        })
      });

      if (!startResponse.ok) {
        if (startResponse.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error(`HTTP error! status: ${startResponse.status}`);
      }

      const taskData: AsyncTaskResponse = await startResponse.json();

      // Poll for completion
      return await this.pollForResult(taskData.session_id, taskData.task_id);
    } catch (error) {
      console.error('Send async message error:', error);
      throw error;
    }
  }

  // Poll for task completion
  private async pollForResult(sessionId: string, taskId: string): Promise<string> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        // Check progress
        const progressResponse = await fetch(
          `${this.baseURL}/progress?session_id=${sessionId}&task_id=${taskId}`,
          {
            method: 'GET',
            headers: this.buildHeaders(),
            credentials: 'include',
          }
        );

        if (progressResponse.ok) {
          const progress: ProgressResponse = await progressResponse.json();

          if (progress.status === 'COMPLETED') {
            // Get the result
            const resultResponse = await fetch(
              `${this.baseURL}/result?session_id=${sessionId}&task_id=${taskId}`,
              {
                method: 'GET',
                headers: this.buildHeaders(),
                credentials: 'include',
              }
            );

            if (resultResponse.ok) {
              const result = await resultResponse.json();
              return result.answer || result;
            }
          } else if (progress.status === 'FAILED') {
            throw new Error('Task failed to complete');
          }
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      } catch (error) {
        console.error('Polling error:', error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    throw new Error('Task timed out');
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/healthz`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const apiClient = new APIClient();

// // API client for backend communication
// const getApiUrl = () => {
//   // In Next.js, environment variables are available via process.env on both client and server
//   if (typeof window !== 'undefined') {
//     // Client-side - use the environment variable or fallback to localhost
//     return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
//   }
//   // Server-side - use the environment variable or fallback to localhost
//   return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
// };

// const API_BASE_URL = getApiUrl();

// export interface ChatMessage {
//   role: 'user' | 'assistant';
//   content: string;
// }

// export interface AuthResponse {
//   status: number;
//   msg: string;
// }

// export interface ChatResponse {
//   status: number;
//   answer: string;
// }

// export interface AsyncTaskResponse {
//   session_id: string;
//   task_id: string;
//   num_steps: number;
// }

// export interface ProgressResponse {
//   status: string;
//   current_step: number;
//   num_steps: number;
//   progress: number;
// }

// export class APIClient {
//   private baseURL: string;

//   constructor(baseURL: string = API_BASE_URL) {
//     this.baseURL = baseURL;
//   }

//   // Authenticate with access code
//   async authenticate(accessCode: string): Promise<boolean> {
//     try {
//       const response = await fetch(`${this.baseURL}/auth`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         credentials: 'include', // Include cookies
//         body: JSON.stringify({
//           access_code: accessCode
//         })
//       });

//       if (response.ok) {
//         return true;
//       }
//       return false;
//     } catch (error) {
//       console.error('Authentication error:', error);
//       return false;
//     }
//   }

//   // Send a chat message (synchronous)
//   async sendMessage(message: string): Promise<string> {
//     try {
//       const response = await fetch(`${this.baseURL}/`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         credentials: 'include', // Include session cookie
//         body: JSON.stringify({
//           workflow: 'my_workflow',
//           args: {
//             query: message,
//             num_steps: 1
//           }
//         })
//       });

//       if (!response.ok) {
//         if (response.status === 401) {
//           throw new Error('Session expired. Please log in again.');
//         }
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const data: ChatResponse = await response.json();
//       return data.answer;
//     } catch (error) {
//       console.error('Send message error:', error);
//       throw error;
//     }
//   }

//   // Send a chat message (asynchronous with polling)
//   async sendMessageAsync(message: string): Promise<string> {
//     try {
//       // Start the task
//       const startResponse = await fetch(`${this.baseURL}/ask`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         credentials: 'include',
//         body: JSON.stringify({
//           workflow: 'my_workflow',
//           args: {
//             query: message,
//             num_steps: 1
//           }
//         })
//       });

//       if (!startResponse.ok) {
//         if (startResponse.status === 401) {
//           throw new Error('Session expired. Please log in again.');
//         }
//         throw new Error(`HTTP error! status: ${startResponse.status}`);
//       }

//       const taskData: AsyncTaskResponse = await startResponse.json();
      
//       // Poll for completion
//       return await this.pollForResult(taskData.session_id, taskData.task_id);
//     } catch (error) {
//       console.error('Send async message error:', error);
//       throw error;
//     }
//   }

//   // Poll for task completion
//   private async pollForResult(sessionId: string, taskId: string): Promise<string> {
//     const maxAttempts = 60; // 5 minutes with 5-second intervals
//     let attempts = 0;

//     while (attempts < maxAttempts) {
//       try {
//         // Check progress
//         const progressResponse = await fetch(
//           `${this.baseURL}/progress?session_id=${sessionId}&task_id=${taskId}`,
//           {
//             method: 'GET',
//             credentials: 'include',
//           }
//         );

//         if (progressResponse.ok) {
//           const progress: ProgressResponse = await progressResponse.json();
          
//           if (progress.status === 'COMPLETED') {
//             // Get the result
//             const resultResponse = await fetch(
//               `${this.baseURL}/result?session_id=${sessionId}&task_id=${taskId}`,
//               {
//                 method: 'GET',
//                 credentials: 'include',
//               }
//             );

//             if (resultResponse.ok) {
//               const result = await resultResponse.json();
//               return result.answer || result;
//             }
//           } else if (progress.status === 'FAILED') {
//             throw new Error('Task failed to complete');
//           }
//         }

//         // Wait before next poll
//         await new Promise(resolve => setTimeout(resolve, 5000));
//         attempts++;
//       } catch (error) {
//         console.error('Polling error:', error);
//         attempts++;
//         await new Promise(resolve => setTimeout(resolve, 5000));
//       }
//     }

//     throw new Error('Task timed out');
//   }

//   // Health check
//   async healthCheck(): Promise<boolean> {
//     try {
//       const response = await fetch(`${this.baseURL}/healthz`);
//       return response.ok;
//     } catch {
//       return false;
//     }
//   }
// }

// export const apiClient = new APIClient();
