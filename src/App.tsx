import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
/*import Analytics from "./pages/Analytics";
import Leaderboards from "./pages/Leaderboards";
import Settings from "./pages/Settings";
import EvmActivityVisualizerPage from "./pages/EvmActivityVisualizer";
import WallChainLeaderboard from "./pages/WallchainLeaderboard";
import WallChainLeaderboard from "./pages/WallchainLeaderboard";
import XeetLeaderboard from "./pages/XeetLeaderboard";
import WallChainLeaderboard from "./pages/WallchainLeaderboard";
import CrossPlatform from "./pages/CrossPlatform"; 
import IncoherencesTable from "./pages/infofi/IncoherencesTable"; 
import FilteredProfilesPage from "./pages/wallchain/FilteredProfilesPage";
import ConsoleSimulator from "./pages/ConsoleSimulator";

*/
import WallChainLeaderboard from "./pages/WallchainLeaderboard";
import XeetLeagueLeaderboard from "./pages/XeetLeagueLeaderboard";
import MindoLeaderboard from "./pages/MindoLeaderboard";
import AirdropCardGenerator from "./pages/AirdropCardGenerator";
import CreatorEarningsCard from "./pages/CreatorEarningsCardGenerator";
import XeetPackGeneratorPage from "./pages/xeet/XeetPackGenerator";
import CryptoDadsTalker from "./pages/CryptoDadsTalker";
import FarmingIndex from "./pages/wallchain/FarmingIndex";
import NFTRoundUpPage from "./pages/NFTRoundup";
import ExodusStatsCalculator from "./pages/ExodusStatsCalculator";
import "./index.css";

export default function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/pack-generator" element={<XeetPackGeneratorPage />} />
                    <Route path="/airdrop-card" element={<AirdropCardGenerator />} />
                    <Route path="/earning-card" element={<CreatorEarningsCard />} />
                    <Route path="/dad-jokes" element={<CryptoDadsTalker />} />
                    <Route path="/wallchain" element={<WallChainLeaderboard />} />
                    < Route path="/xeet-leagues" element={<XeetLeagueLeaderboard />} />
                    < Route path="/mindo" element={<MindoLeaderboard />} />
                    < Route path="/wallchain-index" element={<FarmingIndex />} />
                    < Route path="/nft-roundup" element={<NFTRoundUpPage />} />
                    < Route path="/theplague-exodus" element={<ExodusStatsCalculator />} />
                    {/*
                         < Route path="/comparison" element={<CrossPlatform />} />
                    < Route path="/incoherences" element={<IncoherencesTable />} />
                    < Route path="/console-simulator" element={<ConsoleSimulator />} />
                    < Route path="/wallchain-filter" element={<FilteredProfilesPage />} />
                    < Route path="/nft-roundup" element={<NFTRoundUpPage />} />
                        <Route path="/wallchain" element={<WallChainLeaderboard />} />
                        <Route path="/wallchain" element={<WallChainLeaderboard />} />
                    < Route path="/xeet" element={<XeetLeaderboard />} />
                        < Route path="/xeet" element={<XeetLeaderboard />} />
< Route path="/nft-journey" element={<EvmActivityVisualizerPage />} />
                    <Route path="/wallchain" element={<WallChainLeaderboard />} />

                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/leaderboards" element={<Leaderboards />} />
                    <Route path="/settings" element={<Settings />} />
                    */}
                </Routes>
            </Layout>
        </BrowserRouter>
    );
}
