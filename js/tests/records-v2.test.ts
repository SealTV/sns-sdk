import { test, expect } from "@jest/globals";
import {
  RecordV2,
  deserializeRecordV2,
  getRecordKeyV2,
  serializeRecordV2Content,
  verifyEthereumSignature,
} from "../src/record_v2";
import { Record } from "../src/types/record";
import { Keypair, Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  createRecordV2Instruction,
  updateRecordV2Instruction,
} from "../src/bindings";

jest.setTimeout(50_000);

const connection = new Connection("https://rpc-public.hellomoon.io");

test("Records V2 des/ser", () => {
  let content = "this is a test";
  let ser = serializeRecordV2Content(content, Record.TXT);
  let des = deserializeRecordV2(Buffer.from(ser), Record.TXT);
  expect(des).toBe(content);

  content = Keypair.generate().publicKey.toBase58();
  ser = serializeRecordV2Content(content, Record.SOL);
  des = deserializeRecordV2(Buffer.from(ser), Record.SOL);
  expect(des).toBe(content);
  expect(ser.length).toBe(32);
});

test("Verify ETH signature", () => {
  // Found here https://etherscan.io/verifySig/22233
  const example = {
    address: "0xe88cb208c598e99949ddc23e2a534550391fc5aa",
    msg: "Hello",
    sig: "0x181a40c6b45a28b4189a94b783e85136917ca6cc205a2d39838ac0a1d2b3b705541a2cd551c0e4445ddc4a225c9f8b3ea531c869d4e87ef30ef4b75c8339332d1b",
  };
  const isValid = verifyEthereumSignature(
    example.msg,
    example.sig,
    example.address
  );
  expect(isValid).toBe(true);
});

test("Create record", async () => {
  const domain = "record-v2";
  const owner = new PublicKey("3ogYncmMM5CmytsGCqKHydmXmKUZ6sGWvizkzqwT7zb1");
  const ix = await createRecordV2Instruction(
    connection,
    domain,
    Record.Github,
    0,
    owner,
    owner
  );
  const tx = new Transaction().add(ix);
  tx.feePayer = owner;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const { value } = await connection.simulateTransaction(tx);
  expect(value.err).toBe(null);
});

test("Update record", async () => {
  const domain = "record-v2";
  const owner = new PublicKey("3ogYncmMM5CmytsGCqKHydmXmKUZ6sGWvizkzqwT7zb1");
  const ix = await updateRecordV2Instruction(
    connection,
    domain,
    Record.TXT,
    "test",
    owner,
    owner
  );
  const tx = new Transaction().add(...ix);
  tx.feePayer = owner;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const { value } = await connection.simulateTransaction(tx);
  expect(value.err).toBe(null);
});

test("Fetch record", async () => {
  const domain = "record-v2";
  const recordKey = getRecordKeyV2(domain, Record.TXT);
  const record = await RecordV2.retrieve(connection, recordKey, Record.TXT, {
    skipGuardianSig: true,
    skipUserSig: true,
    deserialize: true,
  });
  expect(record).toBe("test");
});
