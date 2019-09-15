import * as dynamoDbLib from "./libs/dynamodb-lib";
import { success, failure } from "./libs/response-lib";
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

export function main(event, context, callback) {
  dynamoDbLib.call("scan", {TableName: "Comments"})
    .then(res => {
      for (let comment of res.Items) {
        getCommentSentiment(comment);
      }
    })
    .catch(err => {
      console.log(err);
      console.log({ status: false });
    });

  function getCommentSentiment(comment) {
    const {commentText} = comment;
    const result = sentiment.analyze(commentText);
    comment.absoluteSentiment = result.score;
    comment.comparativeSentiment = result.comparative;
    comment.positiveWords = result.positive === [] ? "" : result.positive;
    comment.negativeWords = result.negative === [] ? "" : result.negative;

    putCommentSentiment(comment);
  }

  // updates Comments table with absolute sentiment, comparative sentiment, & most used positive and negative words
  async function putCommentSentiment(comment) {
    const {commentId, videoId, channelId, channelName, title, commentText, comedianGender, absoluteSentiment, comparativeSentiment, positiveWords, negativeWords, createdAt} = comment;
    const updatedAt = Date.now();

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
        absoluteSentiment,
        comparativeSentiment,
        positiveWords,
        negativeWords,
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
  }
}