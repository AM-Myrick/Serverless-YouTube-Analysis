import * as dynamoDbLib from "./libs/dynamodb-lib";
import { success, failure } from "./libs/response-lib";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const axios = require('axios');
const maxResults = 10; //maximum results given by YouTube API per get request

export function main(event, context, callback) {
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

  function getChannelVideoIds(channelName, channelId, nextPageToken = '') {
    axios.get(`https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=${maxResults}&pageToken=${nextPageToken}`)
      .then(async (res) => {
        // if (res.data.items.length < resultsLimit) {
        //   getChannelVideoIds(channelName, channelId, res.data.nextPageToken)
        // }
        // getVideoInfo(channelName)

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