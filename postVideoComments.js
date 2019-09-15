import * as dynamoDbLib from "./libs/dynamodb-lib";
import { success, failure } from "./libs/response-lib";
const axios = require("axios");
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export function main(event, context, callback) {
  dynamoDbLib.call("scan", {TableName: "Videos"})
    .then(res => {
      for (let item of res.Items) {
        getVideoComments(item);
      }
    })
    .catch(err => {
      console.log(err);
      console.log({ status: false });
    });

  function getVideoComments(video, nextPageToken="") {
    const {videoId} = video;
    return axios.get(`https://www.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet%2Creplies&videoId=${videoId}&key=${YOUTUBE_API_KEY}&pageToken=${nextPageToken}`)
    .then(res => {
      for (let item of res.data.items) {
        let commentText = item.snippet.topLevelComment.snippet.textDisplay;
        video.commentId = item.id;
        video.commentText = commentText;
        putVideoComments(video);

        if (item.replies) {
          let comments = item.replies.comments;
          for (let comment of comments) {
            video.commentId = comment.id;
            video.commentText = comment.snippet.textDisplay;
            putVideoComments(video);
          }
        }
      }

      return res.data.nextPageToken ?
        getVideoComments(video, res.data.nextPageToken) :
        res.data;
    })
    .catch(err => {
      return err;
    });
  }

  // updates Comments table with comments
  async function putVideoComments(video) {
    const {commentId, videoId, channelId, channelName, title, commentText, comedianGender} = video;
    const createdAt = Date.now();

    const params = {
      TableName: "Comments",
      Item: {
        commentId,
        videoId,
        channelId,
        channelName,
        title,
        commentText,
        comedianGender,
        createdAt
      }
    };

    try {
      await dynamoDbLib.call("put", params);
      success(params.Item);
    } catch (e) {
      console.log(e);
      failure({ status: false });
    }
  }
}