import * as dynamoDbLib from "./libs/dynamodb-lib";
import { success, failure } from "./libs/response-lib";
const gender = require('gender-guess');

export function main(event, context, callback) {
  dynamoDbLib.call("scan", {TableName: 'Videos'})
    .then(res => {
      for (let item of res.Items) {
        item.comedianGender ? null : getComedianGender(item);
      }
    })
    .catch(err => {
      console.log(err);
      console.log({ status: false });
    });

  function getComedianGender(video) {
    const {title} = video;
    const genderDict = {'M': 'Male', 'F': 'Female'};
    let comedianGender = gender.guess(title).gender === null ? 'Unknown' : genderDict[gender.guess(title).gender];

    if (comedianGender === 'Unknown') {
      const titleArray = title.split(" ");
      for (let word of titleArray) {
        if (gender.guess(word).gender === "M" || gender.guess(word).gender === "F") {
          comedianGender = genderDict[gender.guess(word).gender];
          break;
        }
      }
    }

    video.comedianGender = comedianGender;
    putComedianGender(video);
  }

  async function putComedianGender(video) {
    const {videoId, channelId, channelName, title, viewCount, likeCount, dislikeCount, comedianGender, createdAt, updatedAt} = video;
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
        comedianGender,
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