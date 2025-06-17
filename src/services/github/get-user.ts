import { GITHUB_API_BASE_URL, standardHeaders, getGithubAgent } from "~/lib/api-config"
import { HTTPError } from "~/lib/http-error"
import { state } from "~/lib/state"

export async function getGitHubUser() {
  const response = await fetch(`${GITHUB_API_BASE_URL}/user`, {
    headers: {
      authorization: `token ${state.githubToken}`,
      ...standardHeaders(),
    },
    // @ts-ignore - Bun supports agent option
    agent: getGithubAgent(),
  })

  if (!response.ok) throw new HTTPError("Failed to get GitHub user", response)

  return (await response.json()) as GithubUserResponse
}

// Trimmed for the sake of simplicity
interface GithubUserResponse {
  login: string
}
