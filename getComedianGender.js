import * as dynamoDbLib from "./libs/dynamodb-lib";
import { success, failure } from "./libs/response-lib";
const gender = require('gender-guess');

export function main(event, context, callback) {
  dynamoDbLib.call("scan", {TableName: 'Videos'})
    .then(res => {
      for (let item of res.Items) {
        getComedianGenders(item);
      }
    })
    .catch(err => {
      console.log(err);
      console.log({ status: false });
    });

  async function getComedianGenders(video) {
    const {videoId, channelId, channelName, title, viewCount, likeCount, dislikeCount, createdAt, updatedAt} = video;
    const genderDict = {'M': 'Male', 'F': 'Female'};
    const comedianGender = gender.guess(title).gender === null ? 'Unknown' : genderDict[gender.guess(title).gender];
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
        updatedAt,
        comedianGender
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