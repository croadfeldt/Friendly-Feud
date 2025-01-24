import Image from "next/image";

export default function TeamName(props) {
  return (
    <div
      className="flex flex-col space-y-2 text-center text-3xl"
      style={{
        minWidth: 0,
      }}
    >
      <div className="bg-gradient-to-tr from-myred-900 to-myred-500">
        <p
          id={`team${props.team}TeamName`}
          className="p-5 uppercase text-white"
          style={{
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1,
            textShadow: "1px 2px 4px black",
          }}
        >
          {props.game.teams[props.team].name}
        </p>
      </div>
      <div id={`team${props.team}MistakesList`} className="flex flex-row justify-center space-x-2 text-center">
        {Array(props.game.teams[props.team].mistakes).fill(
          <div className="shrink">
            <Image width={139} height={160} src="/x.png" alt="Team Mistake Indicator" />
          </div>
        )}
      </div>
    </div>
  );
}
