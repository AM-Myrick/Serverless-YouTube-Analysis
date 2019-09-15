import * as dynamoDbLib from "./libs/dynamodb-lib";
import { success, failure } from "./libs/response-lib";

export function main(event, context, callback) {
  dynamoDbLib.call("scan", {TableName: "Sentiments"})
    .then(res => {
      success(res.Items);
    })
    .catch(err => {
      console.log(err);
      failure({ status: false });
    });
}