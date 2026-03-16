const someRandomData = [
  { foo: "bar", baz: 123 },
  { foo: "qux", baz: 456 },
];

export const moreRandomData = "imported data";

export const ssvNetworkAbi = [
  {
    type: "function",
    name: "registerOperator",
    inputs: [
      { name: "publicKey", type: "bytes" },
      { name: "fee", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint64" }],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "OperatorAdded",
    inputs: [
      { name: "operatorId", type: "uint64", indexed: true },
      { name: "owner", type: "address", indexed: true },
    ],
  },
] as const;
