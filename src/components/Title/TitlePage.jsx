import RoomCode from "@/components/Title/RoomCode";
import Team from "@/components/Title/Team";
import TitleLogo from "@/components/TitleLogo";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function TitlePage(props) {
  const { i18n, t } = useTranslation();
  const [titleSize, setTitleSize] = useState("10%");

  useEffect(() => {
    const handleResize = () => {
      if (props.game.settings.logo_url) {
        setTitleSize(window.innerWidth * 0.75);
      } else {
        setTitleSize(
          window.innerWidth *
            (window.innerWidth < 640
              ? 0.8
              : window.innerWidth < 1024
                ? 0.8
                : window.innerWidth < 1280
                  ? 0.7
                  : window.innerWidth < 1536
                    ? 0.75
                    : 0.75)
        );
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [props.game.settings.logo_url]);

  function returnTeamMates(team) {
    let players = [];
    console.debug(props.game);
    Object.keys(props.game.registeredPlayers).forEach((k) => {
      console.debug(k);
      if (props.game.registeredPlayers[k].team === team) {
        players.push(props.game.registeredPlayers[k].name);
      }
    });
    console.debug(players);
    return players;
  }

  return (
    <div className="min-w-screen flex min-h-screen flex-col items-center justify-center bg-gradient-to-t from-primary-900 via-primary-700 to-primary-900 py-5">
      {/* Logo Section */}
      <div
        style={{
          width: titleSize,
          transition: "width 2s",
        }}
        className="inline-block align-middle"
      >
        <div className="flex w-full justify-center ">
          {props.game.settings.logo_url ? (
            <Image
              width={300}
              height={300}
              style={{ objectFit: "contain" }}
              src={`${props.game.settings.logo_url}?v=${Date.now()}`}
              alt="Game logo"
              priority // Load image immediately
              unoptimized // Skip caching
            />
          ) : (
            <TitleLogo insert={props.game.title_text} size={titleSize} />
          )}
        </div>
      </div>

      <div
        className="grid h-[200px] grid-cols-3 gap-4 2xl:h-[250px]"
        style={{
          width: titleSize,
          transition: "width 2s",
        }}
      >
        <Team team={props.game.teams[0].name} points={props.game.teams[0].points} players={returnTeamMates(0)} />
        <RoomCode code={props.game.room} />
        <Team team={props.game.teams[1].name} points={props.game.teams[1].points} players={returnTeamMates(1)} />
      </div>
    </div>
  );
}
