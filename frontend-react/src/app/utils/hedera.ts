import {
  Client,
  AccountId,
  PrivateKey,
  TopicId,
  TopicMessageQuery,
} from "@hashgraph/sdk";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export async function getClient(): Promise<Client> {
  const client = Client.forTestnet();

  const payerPrivateKey = process.env.PAYER_PRIVATE_KEY;
  const payerAccountId = process.env.PAYER_ACCOUNT_ID;
  const payerEvmAddress = process.env.PAYER_EVM_ADDRESS;

  if (payerPrivateKey && (payerAccountId || payerEvmAddress)) {
    const privateKey = PrivateKey.fromStringECDSA(payerPrivateKey);
    const accountId = payerAccountId
      ? AccountId.fromString(payerAccountId)
      : await AccountId.fromEvmAddress(
          0,
          0,
          String(payerEvmAddress)
        ).populateAccountNum(client);
    client.setOperator(accountId, privateKey);
    return client;
  }

  const operatorAddress = requireEnv("OPERATOR_ADDRESS");
  const operatorKey = requireEnv("OPERATOR_KEY");
  const opAccountId = await AccountId.fromEvmAddress(
    0,
    0,
    operatorAddress
  ).populateAccountNum(client);
  const opPrivateKey = PrivateKey.fromStringECDSA(operatorKey);
  client.setOperator(opAccountId, opPrivateKey);

  return client;
}

export async function checkTopicMessage(topicId: string, transactionId: string): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    const client = await getClient();
    let subscription: { unsubscribe: () => void } | null = null;
    const timeout = setTimeout(() => {
      if (subscription) {
        subscription.unsubscribe();
      }
      console.warn(`Timeout waiting for message with transaction ID ${transactionId}`);
      resolve(false); // Resolve with false on timeout
    }, 10000); // 10-second timeout

    try {
    subscription = new TopicMessageQuery()
        .setTopicId(topicId)
        .setStartTime(0) // Start from the beginning of the topic
        .subscribe(
          client,
      (error) => {
            console.error('Error subscribing to topic:', error);
            clearTimeout(timeout);
            reject(error);
          },
          (message) => {
            // The transactionId on the message is the parent transactionId of the HCS submit message
            // It may not be what you are looking for if you need the child transaction id.
            // Here we assume we are checking against the transactionId of the TopicMessageSubmitTransaction
            if (message.transactionId?.toString() === transactionId) {
              clearTimeout(timeout);
              if (subscription) {
                subscription.unsubscribe();
              }
              resolve(true);
            }
          }
        );
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

export async function getTopicMessages(
  topicId: string | TopicId
): Promise<string[]> {
  try {
    const client = await getClient();
    const messages: string[] = [];
    new TopicMessageQuery()
      .setTopicId(topicId)
      .setLimit(5)
      .subscribe(client, null, (message) => {
        messages.push(Buffer.from(message.contents).toString("utf8"));
      });

    // Allow some time for messages to be retrieved
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return messages;
  } catch (error) {
    console.error("Error retrieving topic messages:", error);
    return [];
  }
}
