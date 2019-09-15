import * as dynamoDbLib from "./libs/dynamodb-lib";
import { success, failure } from "./libs/response-lib";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const axios = require('axios');
const maxResults = 10; //maximum results given by YouTube API per get request
// const resultsLimit = 500;

export function main(event, context, callback) {
  // gets all channels in Channels table
  dynamoDbLib.call("scan", {TableName: 'Channels'})
    .then(res => {
      for (let item of res.Items) {
        getChannelVideoIds(item.channelName, item.channelId);
      }
    })
    .catch(err => {
      console.log(err);
      console.log({ status: false });
    });
  
  // gets maxResults latest videos from the given channel, running recursively if resultsLimit > videosCollected
  function getChannelVideoIds(channelName, channelId, nextPageToken = '', videosCollected = 0) {
    axios.get(`https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=${maxResults}&pageToken=${nextPageToken}`)
      .then(async (res) => {
        // if (videosCollected < resultsLimit) {
        //   getChannelVideoIds(channelName, channelId, res.data.nextPageToken, videosCollected += maxResults);
        // }

        for (let item of res.data.items) {
          const videoId = item.id.videoId;
          const title = item.snippet.title;
          const createdAt = Date.now();
          const params = {
            TableName: "Videos",
            Item: {
              videoId,
              channelId,
              channelName,
              title,
              createdAt
            }
          };

          try {
            await dynamoDbLib.call("put", params);
            success(params.Item);
          } catch (e) {
            failure({ status: false });
          }
        }
      })
      .catch(err => {
        console.log(err);
      });
  }
}