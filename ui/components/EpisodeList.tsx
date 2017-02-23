import * as React from 'react';
import { graphql } from 'react-apollo';
import { pure, compose, flattenProp } from 'recompose';

import displayLoadingState from './Loading';
import Episode from './Episode';
import * as EPISODES_QUERY from 'ui/graphql/AllEpisodesQuery.graphql';

interface Props {
  data;
}

const EpisodeList: React.SFC<Props> = ({ data: { allEpisodes } }) => (
  <div>
    <h2>Episodes:</h2>
    {allEpisodes.map(episode =>
      <Episode key={episode.id} episode={episode}/>
    )}
  </div>
);

export default compose(
  graphql(EPISODES_QUERY),
  displayLoadingState,
  // flattenProp('data'),
  pure
)(EpisodeList);
