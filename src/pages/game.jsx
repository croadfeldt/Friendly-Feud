import BuzzerPopup from "@/components/BuzzerPopup";
import FinalPage from "@/components/FinalPage";
import QuestionBoard from "@/components/QuestionBoard";
import Round from "@/components/Round";
import TeamName from "@/components/TeamName";
import TitlePage from "@/components/Title/TitlePage.jsx";
import { ERROR_CODES } from "@/i18n/errorCodes";
import cookieCutter from "cookie-cutter";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

let timerInterval = null;

export default function Game(props) {
  const { i18n, t } = useTranslation();
  const [game, setGame] = useState({});
  const [timer, setTimer] = useState(0);
  const [error, setErrorVal] = useState("");
  const [showMistake, setShowMistake] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [buzzed, setBuzzed] = useState({});
  const ws = useRef(null);
  let refreshCounter = 0;

  useEffect(() => {
    if (game.is_final_round && game.final_round_timers) {
      const timerIndex = game.is_final_second ? 1 : 0;
      setTimer(game.final_round_timers[timerIndex]);
    }
  }, [game.is_final_round, game.is_final_second]);

  function setError(e) {
    setErrorVal(e);
    setTimeout(() => {
      setErrorVal("");
    }, 5000);
  }

  useEffect(() => {
    ws.current = new WebSocket(`wss://${window.location.host}/api/ws`);
    ws.current.onopen = function () {
      console.log("game connected to server");
      let session = cookieCutter.get("session");
      console.debug(session);
      if (session != null) {
        console.debug("found user session", session);
        ws.current.send(JSON.stringify({ action: "game_window", session: session }));
        setInterval(() => {
          console.debug("sending pong in game window");
          let [room, id] = session.split(":");
          ws.current.send(
            JSON.stringify({
              action: "pong",
              session: session,
              id: session.split(":")[1],
              room: session.split(":")[0],
            })
          );
        }, 5000);
      }
    };

    ws.current.onmessage = function (evt) {
      var received_msg = evt.data;
      let json = JSON.parse(received_msg);
      console.debug(json);
      if (json.action === "data") {
        if (Object.keys(buzzed).length === 0 && json.data.buzzed.length > 0) {
          let userId = json.data.buzzed[0].id;
          let user = json.data.registeredPlayers[userId];
          setBuzzed({
            id: userId,
            name: user.name,
            team: json.data.teams[user.team].name,
          });
        } else if (Object.keys(buzzed).length > 0 && json.data.buzzed.length === 0) {
          setBuzzed({});
        }
        if (json.data.title_text === "Change Me") {
          json.data.title_text = t("Change Me");
        }
        if (json.data.teams[0].name === "Team 1") {
          json.data.teams[0].name = `${t("team")} ${t("number", {
            count: 1,
          })}`;
        }
        if (json.data.teams[1].name === "Team 2") {
          json.data.teams[1].name = `${t("team")} ${t("number", {
            count: 2,
          })}`;
        }
        setGame(json.data);
        let session = cookieCutter.get("session");
        let [_, id] = session.split(":");
        if (json.data?.registeredPlayers[id] == "host") {
          setIsHost(true);
        }
      } else if (json.action === "mistake" || json.action === "show_mistake") {
        var audio = new Audio("wrong.mp3");
        audio.play();
        setShowMistake(true);
        setTimeout(() => {
          setShowMistake(false);
        }, 2000);
      } else if (json.action === "quit") {
        setGame({});
        window.close();
      } else if (json.action === "reveal") {
        var audio = new Audio("good-answer.mp3");
        audio.play();
      } else if (json.action === "final_reveal") {
        var audio = new Audio("fm-answer-reveal.mp3");
        audio.play();
      } else if (json.action === "duplicate") {
        var audio = new Audio("duplicate.mp3");
        audio.play();
      } else if (json.action === "final_submit") {
        var audio = new Audio("good-answer.mp3");
        audio.play();
      } else if (json.action === "final_wrong") {
        var audio = new Audio("try-again.mp3");
        audio.play();
      } else if (json.action === "set_timer") {
        setTimer(json.data);
      } else if (json.action === "stop_timer") {
        clearInterval(timerInterval);
      } else if (json.action === "start_timer") {
        timerInterval = setInterval(() => {
          setTimer((prevTimer) => {
            if (prevTimer > 0) {
              return prevTimer - 1;
            } else {
              var audio = new Audio("try-again.mp3");
              audio.play();
              clearInterval(timerInterval);

              // Send timer stop to admin.js
              try {
                let session = cookieCutter.get("session");
                let [room, id] = session.split(":");

                if (!session) {
                  console.error("No session cookie found");
                  return 0;
                }

                if (!room || !id) {
                  console.error("Invalid session cookie format");
                  return 0;
                }

                ws.current.send(
                  JSON.stringify({
                    action: "timer_complete",
                    room: room,
                    id: id,
                  })
                );
              } catch (error) {
                console.error("Error processing session cookie:", error);
              }
              return 0;
            }
          });
        }, 1000);
      } else if (json.action === "change_lang") {
        console.debug("Language Change", json.data);
        i18n.changeLanguage(json.data);
      } else if (json.action === "timer_complete") {
        console.debug("Timer complete");
      } else if (json.action === "clearbuzzers") {
        console.debug("Clear buzzers");
        setBuzzed({});
      } else {
        console.error("didn't expect", json);
      }
    };

    setInterval(() => {
      if (ws.current.readyState !== 1) {
        setError(t(ERROR_CODES.CONNECTION_LOST, { message: `${5 - refreshCounter}` }));
        refreshCounter++;
        if (refreshCounter >= 5) {
          console.debug("game reload()");
          location.reload();
        }
      } else {
        setError("");
      }
    }, 1000);
  }, []);

  let logo = `

<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Created with Inkscape (http://www.inkscape.org/) -->

<svg
   viewBox="0 0 312.12257 64.533996"
   version="1.1"
   id="svg1"
   xml:space="preserve"
   inkscape:version="1.4 (e7c3feb100, 2024-10-09)"
   sodipodi:docname="try3.svg"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg"><sodipodi:namedview
     id="namedview1"
     pagecolor="#32323f"
     bordercolor="#666666"
     borderopacity="1.0"
     inkscape:showpageshadow="2"
     inkscape:pageopacity="0.0"
     inkscape:pagecheckerboard="0"
     inkscape:deskcolor="#d1d1d1"
     inkscape:document-units="mm"
     inkscape:zoom="1.2416518"
     inkscape:cx="462.28742"
     inkscape:cy="82.148635"
     inkscape:window-width="2560"
     inkscape:window-height="1403"
     inkscape:window-x="2560"
     inkscape:window-y="0"
     inkscape:window-maximized="1"
     inkscape:current-layer="layer1" /><defs
     id="defs1"><filter
       style="color-interpolation-filters:sRGB"
       inkscape:label="Drop Shadow"
       id="filter477"
       x="-0.026879473"
       y="-0.13812749"
       width="1.0537589"
       height="1.276255"><feFlood
         result="flood"
         in="SourceGraphic"
         flood-opacity="1.000000"
         flood-color="rgb(0,0,0)"
         id="feFlood476" /><feGaussianBlur
         result="blur"
         in="SourceGraphic"
         stdDeviation="1.000000"
         id="feGaussianBlur476" /><feOffset
         result="offset"
         in="blur"
         dx="0.000000"
         dy="0.000000"
         id="feOffset476" /><feComposite
         result="comp1"
         operator="in"
         in="flood"
         in2="offset"
         id="feComposite476" /><feComposite
         result="comp2"
         operator="out"
         in="comp1"
         in2="SourceGraphic"
         id="feComposite477" /></filter><filter
       style="color-interpolation-filters:sRGB"
       inkscape:label="Drop Shadow"
       id="filter482"
       x="-0.023324842"
       y="-0.11752389"
       width="1.0466497"
       height="1.2350478"><feFlood
         result="flood"
         in="SourceGraphic"
         flood-opacity="1.000000"
         flood-color="rgb(0,0,0)"
         id="feFlood481" /><feGaussianBlur
         result="blur"
         in="SourceGraphic"
         stdDeviation="1.000000"
         id="feGaussianBlur481" /><feOffset
         result="offset"
         in="blur"
         dx="0.000000"
         dy="0.000000"
         id="feOffset481" /><feComposite
         result="comp1"
         operator="in"
         in="flood"
         in2="offset"
         id="feComposite481" /><feComposite
         result="comp2"
         operator="out"
         in="comp1"
         in2="SourceGraphic"
         id="feComposite482" /></filter><filter
       style="color-interpolation-filters:sRGB"
       inkscape:label="Drop Shadow"
       id="filter484"
       x="-0.031067485"
       y="-0.11586865"
       width="1.062135"
       height="1.2317373"><feFlood
         result="flood"
         in="SourceGraphic"
         flood-opacity="1.000000"
         flood-color="rgb(0,0,0)"
         id="feFlood482" /><feGaussianBlur
         result="blur"
         in="SourceGraphic"
         stdDeviation="1.000000"
         id="feGaussianBlur482" /><feOffset
         result="offset"
         in="blur"
         dx="0.000000"
         dy="0.000000"
         id="feOffset482" /><feComposite
         result="comp1"
         operator="in"
         in="flood"
         in2="offset"
         id="feComposite483" /><feComposite
         result="comp2"
         operator="out"
         in="comp1"
         in2="SourceGraphic"
         id="feComposite484" /></filter><filter
       style="color-interpolation-filters:sRGB"
       inkscape:label="Drop Shadow"
       id="filter495"
       x="-0.062480748"
       y="-0.099330999"
       width="1.1249615"
       height="1.198662"><feFlood
         result="flood"
         in="SourceGraphic"
         flood-opacity="1.000000"
         flood-color="rgb(0,0,0)"
         id="feFlood494" /><feGaussianBlur
         result="blur"
         in="SourceGraphic"
         stdDeviation="3.600000"
         id="feGaussianBlur494" /><feOffset
         result="offset"
         in="blur"
         dx="0.000000"
         dy="0.000000"
         id="feOffset494" /><feComposite
         result="comp1"
         operator="in"
         in="flood"
         in2="offset"
         id="feComposite494" /><feComposite
         result="comp2"
         operator="out"
         in="comp1"
         in2="SourceGraphic"
         id="feComposite495" /></filter><filter
       style="color-interpolation-filters:sRGB"
       inkscape:label="Drop Shadow"
       id="filter509"
       x="-0.011746053"
       y="-0.27309409"
       width="1.0234921"
       height="1.5461882"><feFlood
         result="flood"
         in="SourceGraphic"
         flood-opacity="1.000000"
         flood-color="rgb(0,0,0)"
         id="feFlood508" /><feGaussianBlur
         result="blur"
         in="SourceGraphic"
         stdDeviation="0.500000"
         id="feGaussianBlur508" /><feOffset
         result="offset"
         in="blur"
         dx="0.000000"
         dy="0.000000"
         id="feOffset508" /><feComposite
         result="comp1"
         operator="in"
         in="flood"
         in2="offset"
         id="feComposite508" /><feComposite
         result="comp2"
         operator="out"
         in="comp1"
         in2="SourceGraphic"
         id="feComposite509" /></filter><style
       id="style1">
      .st0 {
        fill: #fff;
      }

      .st1 {
        fill: #e00;
      }
    </style></defs><g
     inkscape:label="Layer 1"
     inkscape:groupmode="layer"
     id="layer1"
     transform="translate(424.29182,-172.95084)"><g
       id="Two_line_logo"
       transform="matrix(0.29892229,0,0,0.29892229,-401.7094,184.05336)"
       style="stroke-width:3.34535"><g
         id="g20"
         style="stroke-width:3.34535"><path
           class="st0"
           d="m 318.625,65.249 v -56 h 25.44 c 2.88,0 5.48,0.428 7.8,1.28 2.32,0.854 4.28,2.014 5.88,3.48 1.6,1.468 2.827,3.214 3.68,5.24 0.853,2.027 1.28,4.214 1.28,6.56 0,3.627 -1.04,6.8 -3.12,9.52 -2.08,2.72 -4.88,4.667 -8.4,5.84 l 12.48,24.08 h -9.28 l -11.6,-22.96 h -15.76 v 22.96 z m 24.72,-48.64 h -16.32 v 18.72 h 16.32 c 3.52,0 6.212,-0.906 8.08,-2.72 1.866,-1.812 2.8,-4.026 2.8,-6.64 0,-2.614 -0.934,-4.827 -2.8,-6.64 -1.868,-1.812 -4.56,-2.72 -8.08,-2.72 z"
           id="path1"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 366.065,44.849 c 0,-2.88 0.52,-5.6 1.56,-8.16 1.04,-2.56 2.48,-4.786 4.32,-6.68 1.84,-1.892 4,-3.386 6.48,-4.48 2.48,-1.092 5.16,-1.64 8.04,-1.64 2.773,0 5.373,0.547 7.8,1.64 2.426,1.094 4.506,2.588 6.24,4.48 1.733,1.894 3.106,4.148 4.12,6.76 1.013,2.614 1.52,5.414 1.52,8.4 v 2.32 h -32.16 c 0.533,3.36 2.08,6.147 4.64,8.36 2.56,2.214 5.6,3.32 9.12,3.32 1.973,0 3.866,-0.32 5.68,-0.96 1.812,-0.64 3.36,-1.52 4.64,-2.64 l 5.12,5.04 c -2.4,1.868 -4.868,3.228 -7.4,4.08 -2.534,0.853 -5.32,1.28 -8.36,1.28 -2.988,0 -5.788,-0.548 -8.4,-1.64 -2.614,-1.093 -4.88,-2.573 -6.8,-4.44 -1.92,-1.866 -3.428,-4.093 -4.52,-6.68 -1.094,-2.586 -1.64,-5.373 -1.64,-8.36 z m 20.24,-14.24 c -3.094,0 -5.76,1.014 -8,3.04 -2.24,2.028 -3.654,4.64 -4.24,7.84 h 24.16 c -0.534,-3.093 -1.92,-5.68 -4.16,-7.76 -2.24,-2.08 -4.827,-3.12 -7.76,-3.12 z"
           id="path2"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 445.105,65.249 v -3.84 c -1.708,1.44 -3.628,2.547 -5.76,3.32 -2.134,0.772 -4.374,1.16 -6.721,1.16 -2.879,0 -5.573,-0.548 -8.08,-1.64 -2.507,-1.092 -4.68,-2.586 -6.52,-4.48 -1.84,-1.893 -3.293,-4.132 -4.36,-6.72 -1.067,-2.586 -1.6,-5.32 -1.6,-8.2 0,-2.88 0.533,-5.6 1.6,-8.16 1.066,-2.56 2.52,-4.786 4.36,-6.68 1.84,-1.892 4.026,-3.386 6.56,-4.48 2.533,-1.092 5.266,-1.64 8.2,-1.64 2.293,0 4.48,0.347 6.561,1.04 2.08,0.693 3.972,1.68 5.68,2.96 V 9.249 l 8,-1.76 v 57.76 z m -25.2,-20.48 c 0,4 1.346,7.36 4.04,10.08 2.693,2.72 5.96,4.08 9.8,4.08 2.347,0 4.48,-0.44 6.4,-1.32 1.92,-0.88 3.546,-2.066 4.88,-3.56 v -18.48 c -1.28,-1.44 -2.907,-2.6 -4.88,-3.48 -1.974,-0.88 -4.107,-1.32 -6.4,-1.32 -3.947,0 -7.24,1.348 -9.879,4.04 -2.64,2.694 -3.96,6.014 -3.96,9.96 z"
           id="path3"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 480.064,65.249 v -56 h 8.4 v 24 h 29.76 v -24 h 8.4 v 56 h -8.4 v -24.4 h -29.76 v 24.4 z"
           id="path4"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 549.183,65.969 c -4.428,0 -8.027,-1.16 -10.8,-3.48 -2.773,-2.32 -4.16,-5.293 -4.16,-8.92 0,-4.052 1.561,-7.132 4.68,-9.24 3.12,-2.106 7.053,-3.16 11.801,-3.16 1.972,0 3.906,0.2 5.8,0.6 1.893,0.4 3.666,0.947 5.32,1.64 v -4.32 c 0,-2.88 -0.854,-5.04 -2.561,-6.48 -1.707,-1.44 -4.16,-2.16 -7.36,-2.16 -1.974,0 -3.987,0.293 -6.04,0.88 -2.054,0.587 -4.253,1.44 -6.6,2.56 l -2.96,-6 c 2.88,-1.333 5.68,-2.36 8.4,-3.08 2.72,-0.72 5.492,-1.08 8.319,-1.08 5.227,0 9.307,1.254 12.24,3.76 2.933,2.507 4.4,6.107 4.4,10.8 v 26.96 h -7.84 v -3.52 c -1.761,1.44 -3.694,2.507 -5.801,3.2 -2.107,0.692 -4.387,1.04 -6.84,1.04 z m -7.28,-12.56 c 0,1.974 0.853,3.574 2.561,4.8 1.706,1.228 3.893,1.84 6.56,1.84 2.133,0 4.106,-0.32 5.92,-0.96 1.812,-0.64 3.44,-1.6 4.881,-2.88 v -7.12 c -1.494,-0.8 -3.094,-1.4 -4.801,-1.8 -1.707,-0.4 -3.6,-0.6 -5.68,-0.6 -2.773,0 -5.04,0.587 -6.8,1.76 -1.76,1.173 -2.641,2.827 -2.641,4.96 z"
           id="path5"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 582.623,55.169 v -23.92 h -8.641 v -6.72 h 8.641 v -10.4 l 7.92,-1.92 v 12.32 h 12 v 6.72 h -12 v 22.08 c 0,2.08 0.466,3.547 1.399,4.4 0.933,0.854 2.467,1.28 4.601,1.28 1.172,0 2.187,-0.066 3.04,-0.2 0.853,-0.132 1.786,-0.386 2.8,-0.76 v 6.72 c -1.12,0.374 -2.374,0.666 -3.76,0.88 -1.388,0.212 -2.668,0.32 -3.84,0.32 -3.948,0 -6.96,-0.92 -9.04,-2.76 -2.08,-1.84 -3.12,-4.52 -3.12,-8.04 z"
           id="path6"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 317.985,93.247 h 43.361 v 10.081 h -31.76 v 13.2 h 21.12 v 9.76 h -21.12 v 22.96 h -11.601 z"
           id="path7"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 377.665,149.249 h -10.96 V 93.248 l 10.96,-2.4 z"
           id="path8"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 385.185,96.367 c 0,-3.44 2.88,-6.24 6.24,-6.24 3.44,0 6.24,2.8 6.24,6.24 0,3.44 -2.8,6.24 -6.24,6.24 -3.36,0 -6.24,-2.8 -6.24,-6.24 z m 11.761,52.882 h -10.96 v -41.681 h 10.96 z"
           id="path9"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 403.505,128.128 c 0,-11.84 9.44,-21.2 21.44,-21.2 4.08,0 8,1.2 11.28,3.28 v -2.64 h 10.801 v 41.601 c 0,11.12 -7.36,17.2 -20.64,17.2 -6.24,0 -12.4,-1.279 -17.36,-3.76 l 3.84,-8.561 c 4.64,2.24 8.96,3.36 13.28,3.36 6.56,0 9.92,-2.8 9.92,-8.32 v -3.36 c -3.28,2.4 -7.2,3.761 -11.44,3.761 -11.84,0 -21.121,-9.44 -21.121,-21.361 z m 22.8,12.081 c 3.92,0 7.28,-1.36 9.76,-3.76 v -16.4 c -2.4,-2.32 -5.92,-3.76 -9.68,-3.76 -6.8,0 -12.081,5.2 -12.081,11.84 0,6.8 5.2,12.081 12,12.081 z"
           id="path10"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 483.585,124.928 c 0,-5.2 -3.36,-8.72 -8.721,-8.72 -3.68,0 -6.64,1.36 -8.561,4.16 v 28.881 h -10.96 V 93.248 l 10.96,-2.4 v 20.081 c 3.12,-2.72 7.121,-4.16 11.681,-4.16 9.761,0 16.48,6.88 16.48,16.561 v 25.92 h -10.88 v -24.32 z"
           id="path11"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 507.024,116.768 h -8.56 v -9.2 h 8.56 v -10.64 l 10.961,-2.48 v 13.12 h 11.84 v 9.2 h -11.84 v 18.48 c 0,3.92 1.52,5.36 5.76,5.36 2.16,0 3.76,-0.32 5.84,-0.96 v 8.96 c -2.399,0.72 -6.16,1.279 -8.479,1.279 -9.12,0 -14.081,-4.16 -14.081,-12.4 v -20.721 z"
           id="path12"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 535.984,93.247 h 28.08 c 11.041,0 18.801,7.36 18.801,17.601 0,9.84 -7.76,17.28 -18.801,17.28 h -16.479 v 21.121 H 535.984 V 93.248 Z m 11.6,10.001 v 15.28 h 15.2 c 5.2,0 8.32,-3.2 8.32,-7.6 0,-4.48 -3.12,-7.68 -8.32,-7.68 z"
           id="path13"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 586.144,137.169 c 0,-8.16 6.721,-12.641 17.121,-12.641 3.6,0 7.04,0.56 10.16,1.6 v -2.96 c 0,-4.88 -2.96,-7.28 -8.801,-7.28 -3.76,0 -7.84,1.28 -12.72,3.44 l -4,-8.08 c 6.479,-2.96 12.4,-4.48 18.561,-4.48 11.12,0 17.76,5.44 17.76,15.44 v 27.041 h -10.8 v -2.96 c -3.521,2.56 -7.36,3.68 -12.08,3.68 -9.2,0 -15.201,-5.439 -15.201,-12.8 z m 18.081,4.96 c 3.52,0 6.64,-0.88 9.2,-2.64 v -6.24 c -2.561,-0.96 -5.44,-1.52 -8.801,-1.52 -4.8,0 -8,1.84 -8,5.2 0,3.2 2.96,5.2 7.601,5.2 z"
           id="path14"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 636.784,116.768 h -8.56 v -9.2 h 8.56 v -10.64 l 10.961,-2.48 v 13.12 h 11.84 v 9.2 h -11.84 v 18.48 c 0,3.92 1.52,5.36 5.76,5.36 2.16,0 3.76,-0.32 5.84,-0.96 v 8.96 c -2.399,0.72 -6.16,1.279 -8.479,1.279 -9.12,0 -14.081,-4.16 -14.081,-12.4 v -20.721 z"
           id="path15"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 693.105,124.928 c 0,-5.2 -3.36,-8.72 -8.72,-8.72 -3.681,0 -6.641,1.36 -8.561,4.16 v 28.881 h -10.96 V 93.248 l 10.96,-2.4 v 20.081 c 3.12,-2.72 7.12,-4.16 11.681,-4.16 9.76,0 16.479,6.88 16.479,16.561 v 25.92 h -10.88 v -24.32 z"
           id="path16"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 725.662,93.247 h 49.281 v 10.24 h -18.8 v 45.761 h -11.601 v -45.761 h -18.881 v -10.24 z"
           id="path17"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 790.062,106.848 c 11.841,0 20.641,9.6 20.641,22.4 v 2.88 h -31.04 c 1.52,5.2 6.08,8.72 11.84,8.72 3.68,0 6.96,-1.2 9.2,-3.36 l 7.2,6.56 c -5.12,4.16 -10.24,6 -16.88,6 -12.641,0 -22.401,-9.44 -22.401,-21.6 0,-12.081 9.36,-21.601 21.44,-21.601 z m -10.48,17.44 h 20.4 c -1.36,-5.04 -5.28,-8.4 -10.16,-8.4 -5.04,0 -8.881,3.28 -10.24,8.4 z"
           id="path18"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 815.262,137.169 c 0,-8.16 6.72,-12.641 17.12,-12.641 3.601,0 7.04,0.56 10.16,1.6 v -2.96 c 0,-4.88 -2.96,-7.28 -8.8,-7.28 -3.76,0 -7.84,1.28 -12.721,3.44 l -4,-8.08 c 6.48,-2.96 12.4,-4.48 18.561,-4.48 11.12,0 17.761,5.44 17.761,15.44 v 27.041 h -10.801 v -2.96 c -3.52,2.56 -7.359,3.68 -12.08,3.68 -9.2,0 -15.2,-5.439 -15.2,-12.8 z m 18.08,4.96 c 3.521,0 6.641,-0.88 9.2,-2.64 v -6.24 c -2.56,-0.96 -5.439,-1.52 -8.8,-1.52 -4.8,0 -8,1.84 -8,5.2 0,3.2 2.96,5.2 7.6,5.2 z"
           id="path19"
           style="stroke-width:3.34535" /><path
           class="st0"
           d="m 861.661,107.568 h 10.96 v 3.12 c 2.96,-2.56 6.641,-3.92 10.88,-3.92 5.36,0 9.841,2.32 12.561,6.16 3.44,-4 8.16,-6.16 13.761,-6.16 9.439,0 16,6.88 16,16.561 v 25.92 h -10.96 v -24.32 c 0,-5.2 -3.04,-8.72 -7.921,-8.72 -3.359,0 -6.08,1.44 -8,4.16 0.16,0.88 0.24,1.92 0.24,2.96 v 25.92 h -10.96 v -24.32 c 0,-5.2 -2.96,-8.72 -7.841,-8.72 -3.279,0 -5.92,1.36 -7.76,3.84 v 29.201 h -10.96 v -41.681 z"
           id="path20"
           style="stroke-width:3.34535" /></g><g
         id="Hat_icon"
         style="stroke-width:3.34535"><g
           id="g21"
           style="stroke-width:3.34535"><path
             id="Red_hat"
             class="st1"
             d="m 128.97,92.243 c 12.503,0 30.611,-2.587 30.611,-17.461 0,-1.161 -0.033,-2.291 -0.311,-3.421 l -7.45,-32.363 c -1.725,-7.114 -3.234,-10.347 -15.737,-16.599 -9.701,-4.958 -30.826,-13.15 -37.078,-13.15 -5.82,0 -7.545,7.545 -14.443,7.545 -6.683,0 -11.641,-5.605 -17.892,-5.605 -6.036,0 -9.916,4.096 -12.934,12.503 0,0 -8.407,23.713 -9.485,27.162 -0.216,0.647 -0.221,1.373 -0.221,1.94 0,9.215 36.292,39.449 84.939,39.449 z m 32.551,-11.426 c 1.725,8.192 1.725,9.054 1.725,10.132 0,14.012 -15.737,21.772 -36.431,21.772 -46.778,0 -87.737,-27.377 -87.737,-45.485 0,-2.802 0.647,-5.389 1.509,-7.329 C 23.773,60.769 2,63.787 2,82.973 c 0,31.473 74.587,70.275 133.653,70.275 45.269,0 56.695,-20.479 56.695,-36.647 0,-12.719 -10.994,-27.162 -30.826,-35.784 z"
             style="stroke-width:3.34535" /><path
             id="Black_band"
             d="m 161.521,80.817 c 1.725,8.192 1.725,9.054 1.725,10.132 0,14.012 -15.737,21.772 -36.431,21.772 -46.778,0 -87.737,-27.377 -87.737,-45.485 0,-2.802 0.647,-5.389 1.509,-7.329 l 3.665,-9.054 c -0.216,0.647 -0.221,1.373 -0.221,1.94 0,9.215 36.292,39.449 84.939,39.449 12.503,0 30.611,-2.587 30.611,-17.461 0,-1.161 -0.033,-2.291 -0.311,-3.421 z"
             style="stroke-width:3.34535" /></g></g><path
         id="Dividing_line"
         class="st0"
         d="m 255.468,160.749 c -1.243,0 -2.25,-1.007 -2.25,-2.25 V 4.249 c 0,-1.243 1.007,-2.25 2.25,-2.25 1.243,0 2.25,1.007 2.25,2.25 v 154.25 c 0,1.243 -1.007,2.25 -2.25,2.25 z"
         style="stroke-width:3.34535" /></g></g></svg>
  `;

  if (game.teams != null) {
    let gameSession;
    if (game.title) {
      gameSession = <TitlePage game={game} />;
    } else if (game.is_final_round) {
      gameSession = (
        <div className="flex w-full justify-center">
          <div className="flex w-11/12 flex-col space-y-6 py-20 sm:w-11/12 sm:px-8 md:w-4/6 lg:w-5/6">
            <FinalPage game={game} timer={timer} />
          </div>
        </div>
      );
    } else {
      gameSession = (
        <div className="flex flex-col space-y-10 px-10 py-20">
          <Round game={game} />
          <QuestionBoard round={game.rounds[game.round]} />
          <div className="flex flex-row justify-around">
            <TeamName game={game} team={0} />
            <TeamName game={game} team={1} />
          </div>
        </div>
      );
    }

    if (typeof window !== "undefined") {
      document.body.className = game?.settings?.theme + " bg-background";
    }
    return (
      <>
        {!isHost ? (
          <div className="absolute flex w-screen flex-col items-end">
            <div
              className="m-1"
              style={{
                width: "330px",
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: logo }} />
            </div>
          </div>
        ) : null}
        <div className="pointer-events-none absolute">
          <Image
            id="xImg"
            width={1000}
            height={1000}
            className={`pointer-events-none fixed inset-0 z-50 p-24 ${
              showMistake ? "opacity-90" : "opacity-0"
            } transition-opacity duration-300 ease-in-out`}
            src="/x.svg"
            alt="Mistake indicator"
            aria-hidden={!showMistake}
          />
        </div>
        <div className={`${game?.settings?.theme} min-h-screen`}>
          <div className="">
            {gameSession}
            {error !== "" ? <p className="text-2xl text-failure-700">{error}</p> : null}
          </div>
        </div>
        <BuzzerPopup buzzed={buzzed} />
      </>
    );
  } else {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-10">
        <p>{t("No game session. retry from the admin window")}</p>
        <button
          className="m-1 rounded-lg bg-secondary-500 p-2 font-bold uppercase shadow-md hover:bg-secondary-200"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          {t("quit")}
        </button>
      </div>
    );
  }
}
