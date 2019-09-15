import * as dynamoDbLib from "./libs/dynamodb-lib";
import { success, failure } from "./libs/response-lib";
import uuid from "uuid";
const channels = {};
const genders = ["Male", "Female", "Unknown"];
let channelNames;

export function main(event, context, callback) {
  const promises = [];
  dynamoDbLib.call("scan", {TableName: "Channels"})
    .then(async (res) => {
      for (let item of res.Items) {
        const {channelName} = item;
        channels[channelName] ?
          null :
          channels[channelName] = {
            'Male': {
              absoluteSentiments: [],
              comparativeSentiments: [],
              viewCounts: [],
              likeCounts: [],
              dislikeCounts: [],
              positiveWords: [],
              negativeWords: []
            },
            'Female': {
              absoluteSentiments: [],
              comparativeSentiments: [],
              viewCounts: [],
              likeCounts: [],
              dislikeCounts: [],
              positiveWords: [],
              negativeWords: []
            },
            'Unknown': {
              absoluteSentiments: [],
              comparativeSentiments: [],
              viewCounts: [],
              likeCounts: [],
              dislikeCounts: [],
              positiveWords: [],
              negativeWords: []
            }
          };
      }
      channelNames = Object.keys(channels);
      promises.push(populateWithSentiment(channels));
      promises.push(populateWithStatistics(channels));
      Promise.all(promises).then(() => getAverages(channels));
    })
    .catch(err => {
      console.log(err);
      console.log({ status: false });
    });

  function populateWithSentiment(channels) {
    return dynamoDbLib.call("scan", {TableName: "Comments"})
    .then(res => {
      for (let item of res.Items) {
        const {channelName, absoluteSentiment, comparativeSentiment, positiveWords, negativeWords, comedianGender} = item;
        const category = channels[channelName][comedianGender];

        category.absoluteSentiments.push(absoluteSentiment);
        category.comparativeSentiments.push(comparativeSentiment);
        positiveWords.map(e => category.positiveWords.push(e));
        negativeWords.map(e => category.negativeWords.push(e));
      }
      return Promise.resolve();
    })
    .catch(err => {
      console.log(err);
      console.log({ status: false });
    });
  }

  function populateWithStatistics(channels) {
    return dynamoDbLib.call("scan", {TableName: "Videos"})
    .then(res => {
      for (let item of res.Items) {
        const {channelName, viewCount, likeCount, dislikeCount, comedianGender} = item;
        const category = channels[channelName][comedianGender];

        category.viewCounts.push(parseInt(viewCount));
        category.likeCounts.push(parseInt(likeCount));
        category.dislikeCounts.push(parseInt(dislikeCount));
      }
      return Promise.resolve();
    })
    .catch(err => {
      console.log(err);
      console.log({ status: false });
    });
  }

  function getAverages(channels) {
    const average = array => array.reduce((a, b) => a + b) / array.length;

    for (let channelName of channelNames) {
      const maleStats = channels[channelName]["Male"];
      const femaleStats = channels[channelName]["Female"];
      const unknownStats = channels[channelName]["Unknown"];

      maleStats.avgAbsoluteSentiment = maleStats.absoluteSentiments.length ? average(maleStats.absoluteSentiments) : null;
      maleStats.avgComparativeSentiment = maleStats.comparativeSentiments.length ? average(maleStats.comparativeSentiments) : null;
      maleStats.avgViewCount = maleStats.viewCounts.length ? average(maleStats.viewCounts) : null;
      maleStats.avgLikeCount = maleStats.likeCounts.length ? average(maleStats.likeCounts) : null;
      maleStats.avgDislikeCount = maleStats.dislikeCounts.length ? average(maleStats.dislikeCounts) : null;

      femaleStats.avgAbsoluteSentiment = femaleStats.absoluteSentiments.length ? average(femaleStats.absoluteSentiments) : null;
      femaleStats.avgComparativeSentiment = femaleStats.comparativeSentiments.length ? average(femaleStats.comparativeSentiments) : null;
      femaleStats.avgViewCount = femaleStats.viewCounts.length ? average(femaleStats.viewCounts) : null;
      femaleStats.avgLikeCount = femaleStats.likeCounts.length ? average(femaleStats.likeCounts) : null;
      femaleStats.avgDislikeCount = femaleStats.dislikeCounts.length ? average(femaleStats.dislikeCounts) : null;

      unknownStats.avgAbsoluteSentiment = unknownStats.absoluteSentiments.length ? average(unknownStats.absoluteSentiments) : null;
      unknownStats.avgComparativeSentiment = unknownStats.comparativeSentiments.length ? average(unknownStats.comparativeSentiments) : null;
      unknownStats.avgViewCount = unknownStats.viewCounts.length ? average(unknownStats.viewCounts) : null;
      unknownStats.avgLikeCount = unknownStats.likeCounts.length ? average(unknownStats.likeCounts) : null;
      unknownStats.avgDislikeCount = unknownStats.dislikeCounts.length ? average(unknownStats.dislikeCounts) : null;
    }
    postChannelSentiment(channels);
  }

  // updates Sentiments table with sentiments
  async function postChannelSentiment(channels) {
    for (let channelName of channelNames) {
      for (let gender of genders) {
        const avgAbsoluteSentiment = channels[channelName][gender].avgAbsoluteSentiment;
        const avgComparativeSentiment = channels[channelName][gender].avgComparativeSentiment;
        const avgViewCount = channels[channelName][gender].avgViewCount;
        const avgLikeCount = channels[channelName][gender].avgLikeCount;
        const avgDislikeCount = channels[channelName][gender].avgDislikeCount;
        const createdAt = Date.now();

        const params = {
          TableName: "Sentiments",
          Item: {
            sentimentId : uuid.v1(),
            channelName,
            gender,
            avgAbsoluteSentiment,
            avgComparativeSentiment,
            avgViewCount,
            avgLikeCount,
            avgDislikeCount,
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
  }
}