import { ApolloClient, InMemoryCache, HttpLink, NormalizedCacheObject } from "@apollo/client";
import { ENVIO_GRAPHQL_URL } from "./constants";

// ===========================================
// Apollo Client Configuration for Envio
// ===========================================

/**
 * Create HTTP link to Envio GraphQL endpoint
 */
const httpLink = new HttpLink({
  uri: ENVIO_GRAPHQL_URL,
  // Add headers if needed for authentication
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Configure in-memory cache with type policies
 * These ensure proper normalization and caching of entities
 */
const cache = new InMemoryCache({
  typePolicies: {
    // Core entities - use id as key field
    Agent: {
      keyFields: ["id"],
      fields: {
        // Merge execution lists when paginating
        executions: {
          keyArgs: false,
          merge(existing = [], incoming) {
            return [...existing, ...incoming];
          },
        },
        dailyStats: {
          keyArgs: false,
          merge(existing = [], incoming) {
            return [...existing, ...incoming];
          },
        },
      },
    },
    Execution: {
      keyFields: ["id"],
    },
    User: {
      keyFields: ["id"],
      fields: {
        permissions: {
          keyArgs: false,
          merge(existing = [], incoming) {
            return [...existing, ...incoming];
          },
        },
        executions: {
          keyArgs: false,
          merge(existing = [], incoming) {
            return [...existing, ...incoming];
          },
        },
      },
    },
    Permission: {
      keyFields: ["id"],
    },
    Redelegation: {
      keyFields: ["id"],
    },

    // Analytics entities
    AgentDailyStat: {
      keyFields: ["id"],
    },
    GlobalStats: {
      keyFields: ["id"],
    },
    LeaderboardSnapshot: {
      keyFields: ["id"],
    },
    LeaderboardEntry: {
      keyFields: ["id"],
    },

    // Reputation entities
    Feedback: {
      keyFields: ["id"],
    },
    FeedbackResponse: {
      keyFields: ["id"],
    },
    ValidationRequest: {
      keyFields: ["id"],
    },
    Validator: {
      keyFields: ["id"],
    },
    AgentReputationSummary: {
      keyFields: ["id"],
    },

    // Root query type
    Query: {
      fields: {
        // Use cache-first for agent queries since they update frequently via polling
        agent: {
          read(_, { args, toReference }) {
            return toReference({
              __typename: "Agent",
              id: args?.id,
            });
          },
        },
        user: {
          read(_, { args, toReference }) {
            return toReference({
              __typename: "User",
              id: args?.id,
            });
          },
        },
      },
    },
  },
});

/**
 * Private Apollo Client instance for singleton pattern
 * Use getApolloClient() to access
 */
let _apolloClientInstance: ApolloClient<NormalizedCacheObject> | null = null;

/**
 * Create or return existing Apollo Client
 * This pattern supports SSR and prevents multiple clients
 */
export function getApolloClient(): ApolloClient<NormalizedCacheObject> {
  // For SSR, always create a new client
  if (typeof window === "undefined") {
    return new ApolloClient({
      ssrMode: true,
      link: httpLink,
      cache: new InMemoryCache(),
    });
  }

  // For client-side, reuse existing client
  if (!_apolloClientInstance) {
    _apolloClientInstance = new ApolloClient({
      link: httpLink,
      cache,
      defaultOptions: {
        watchQuery: {
          // Fetch from cache first, then network
          fetchPolicy: "cache-and-network",
          // Return partial data while loading
          returnPartialData: true,
          // Show all errors so users can see issues
          errorPolicy: "all",
        },
        query: {
          // Always fetch fresh data for direct queries
          fetchPolicy: "network-only",
          // Include all errors in response
          errorPolicy: "all",
        },
        mutate: {
          errorPolicy: "all",
        },
      },
      // Enable query batching for performance
      queryDeduplication: true,
    });
  }

  return _apolloClientInstance;
}

/**
 * Export the client for use with ApolloProvider
 */
export const apolloClient = getApolloClient();

/**
 * Reset the Apollo cache
 * Useful after wallet connection/disconnection
 */
export async function resetApolloCache(): Promise<void> {
  if (_apolloClientInstance) {
    await _apolloClientInstance.resetStore();
  }
}

/**
 * Clear the Apollo cache without refetching
 * Useful for logout scenarios
 */
export function clearApolloCache(): void {
  if (_apolloClientInstance) {
    _apolloClientInstance.cache.reset();
  }
}
