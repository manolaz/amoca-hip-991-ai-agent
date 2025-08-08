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
