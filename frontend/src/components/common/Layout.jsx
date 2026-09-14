import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import ReportBugButton from "./ReportBugButton";

/**
 * Wraps every authenticated route with the Navbar exactly once.
 * Each page keeps full control over its own background/padding —
 * this component only renders the Navbar plus whatever the matched
 * child route renders via <Outlet />.
 */
export default function Layout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <ReportBugButton />
    </>
  );
}
