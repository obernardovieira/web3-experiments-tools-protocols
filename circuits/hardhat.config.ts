import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-viem";

const config: HardhatUserConfig = {
	solidity: {
		version: '0.8.19',
		settings: {
			optimizer: { enabled: true, runs: 5000 },
		},
	},
	paths: {
		sources: "./circuits/contract/circuits",
	},
};

export default config;
