/** @jsx h */
import { h } from "preact";
import HtmlWrapper from "./html_wrapper.jsx";

const Main = () => (
  <div class="main">
    <span>Main page</span>
  </div>
);

const PageMain = () => (
  <HtmlWrapper>
    <Main />
  </HtmlWrapper>
);

export default {
  main: <PageMain />
};
