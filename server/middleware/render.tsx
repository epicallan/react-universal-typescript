import 'isomorphic-fetch';

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { ApolloProvider, renderToStringWithData } from 'react-apollo';
import { styleSheet } from 'styled-components';
import * as LRUCache from 'lru-cache';

import App from 'ui/containers/App';
import Html from 'server/views/Html';
import configureApolloClient from 'ui/utils/configureApolloClient';
import getNetworkInterface from 'ui/transport';
import configureStore from 'ui/store/configureStore';

// This is where we cache our rendered HTML pages
const ssrCache = new LRUCache({
  max: 100,
  maxAge: 1000 * 60 * 60 // 1hour
});

function getCacheKey(req) {
  return `${req.url}`;
}

export default (req, res) => {
  const PROJECT_ID = process.env.GRAPHCOOL_PROJECT_ID;
  const GRAPHQL_HOST = `https://api.graph.cool/simple/v1/${PROJECT_ID}`;
  const context: any = {};
  const client = configureApolloClient({
    ssrMode: true,
    networkInterface: getNetworkInterface(GRAPHQL_HOST, { cookie: req.header('Cookie') })
  });
  const store = configureStore(client);

  const key = getCacheKey(req);

  // If we have a page in the cache, let's serve it
  if (ssrCache.has(key)) {
    console.log(`CACHE HIT: ${key}`);
    res.send(ssrCache.get(key));
    return;
  }

  renderToStringWithData(
    <StaticRouter location={req.url} context={context}>
      <ApolloProvider client={client} store={store}>
        <App />
      </ApolloProvider>
    </StaticRouter>
  ).then(html => {
    if (context.url) {
      return res.redirect(302, context.url);
    }

    const styles = styleSheet.getCSS();
    const initialState = {[client.reduxRootKey]: client.getInitialState() };
    const state = { ...initialState };

    const markup = renderToStaticMarkup(
      <Html
        html={html}
        state={state}
        styles={styles}
      />
    );

    // Let's cache this page
    console.log(`CACHE MISS: ${key}`);
    ssrCache.set(key, `<!doctype html>${markup}`);

    return res
      .status(context.status || 200)
      .send(`<!doctype html>${markup}`);
  }).catch(error => {
    console.log(error);
    res.sendStatus(500);
  });
};
