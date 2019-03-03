/** @jsx h */
import { h } from "preact";

const HtmlWrapper = props => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Static render html webpack plugin</title>
    </head>
    <body>{props.children}</body>
  </html>
);

export default HtmlWrapper;
