import { ApolloClient, InMemoryCache, HttpLink, gql, ApolloLink } from '@apollo/client';
import { useAuthStore } from '../store/authStore';

const authLink = new ApolloLink((operation, forward) => {
  const token = useAuthStore.getState().user?.token;
  operation.setContext(({ headers = {} }: any) => ({
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }));
  return forward(operation);
});

const httpLink = new HttpLink({
  uri: 'http://localhost:5000/graphql',
});

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export const HELLO_QUERY = gql`
  query Hello {
    hello
  }
`;
