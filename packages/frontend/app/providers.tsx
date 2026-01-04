"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApolloProvider } from "@apollo/client";
import { Toaster } from "sonner";
import { config } from "@/lib/wagmi-config";
import { getApolloClient } from "@/lib/apollo-client";
import { ChainGuard } from "@/components/ChainGuard";

// ===========================================
// App Providers Component
// ===========================================

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Create QueryClient instance with useState to avoid recreating on re-renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for better UX
            refetchOnWindowFocus: false,
            // Retry failed requests 3 times
            retry: 3,
            // Keep data fresh for 60 seconds
            staleTime: 60 * 1000,
          },
        },
      })
  );

  // Get Apollo Client instance
  const apolloClient = getApolloClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ApolloProvider client={apolloClient}>
          <ChainGuard>
            {children}
          </ChainGuard>
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 5000,
              classNames: {
                toast: "bg-white border border-gray-200 shadow-lg rounded-lg",
                title: "text-gray-900 font-medium",
                description: "text-gray-500 text-sm",
                success: "border-green-200 bg-green-50",
                error: "border-red-200 bg-red-50",
                warning: "border-yellow-200 bg-yellow-50",
              },
            }}
          />
        </ApolloProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// ===========================================
// Re-export hooks for convenience
// ===========================================

// These can be imported from providers.tsx in other components
export { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
export { useQuery, useMutation } from "@apollo/client";
