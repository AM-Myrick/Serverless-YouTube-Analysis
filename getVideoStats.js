import * as dynamoDbLib from "./libs/dynamodb-lib";
import { success, failure } from "./libs/response-lib";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const axios = require('axios');

export function main(event, context, callback) {
  // gets all videos in Videos table
  dynamoDbLib.call("scan", {TableName: 'Videos'})
    .then(res => {
      for (let item of res.Items) {
        getVideoStatistics(item);
      }
    })
    .catch(err => {
      console.log(err);
      console.log({ status: false });
    });

  // gets views, likes, and dislikes for all videos and updates Videos table
  function getVideoStatistics(video) {
    const {videoId, channelId, channelName, title, createdAt} = video;

    axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`)
    .then(async (res) => {
      const item = res.data.items[0];
      const viewCount = item.statistics.viewCount;
      const likeCount = item.statistics.likeCount;
      const dislikeCount = item.statistics.dislikeCount;
      const updatedAt = Date.now();
      
      const params = {
        TableName: "Videos",
        Item: {
          videoId,
          channelId,
          channelName,
          title,
          viewCount,
          likeCount,
          dislikeCount,
          createdAt,
          updatedAt
        }
      };

      try {
        await dynamoDbLib.call("put", params);
        success(params.Item);
      } catch (e) {
        console.log(e);
        failure({ status: false });
      }
    })
    .catch(err => {
      console.log(err);
      console.log({ status: false });
    });
  }
}