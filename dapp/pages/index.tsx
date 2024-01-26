import type { NextPage } from "next";
import React from "react";
import Header from "../components/Header";
import Join from "../components/Join";

const Home: NextPage = () => {

	return (
		<div>
			<Header />
			<Join />
		</div>
	);
};

export default Home;
