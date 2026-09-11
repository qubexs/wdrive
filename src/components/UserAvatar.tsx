import Image from "next/image";

const PALETTE = [
  "bg-[#1a73e8]",
  "bg-[#0b8043]",
  "bg-[#9334e6]",
  "bg-[#e8710a]",
  "bg-[#c5221f]",
  "bg-[#0097a7]",
  "bg-[#e91e63]",
  "bg-[#5c6bc0]",
];

function colorFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

type Props = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  className?: string;
  imgWidth?: number;
  imgHeight?: number;
};

// Shows the custom avatar image, or a Google-style letter avatar fallback.
export default function UserAvatar({ name, email, image, className = "h-full w-full", imgWidth = 112, imgHeight = 112 }: Props) {
  if (image) {
    return (
      <Image
        src={image}
        alt="avatar"
        width={imgWidth}
        height={imgHeight}
        className={`${className} rounded-full object-cover object-center`}
        draggable={false}
      />
    );
  }
  const key = (name ?? "").trim() || (email ?? "").trim() || "?";
  const letter = (key[0] ?? "?").toUpperCase();
  return (
    <span
      className={`${className} ${colorFor(key.toLowerCase())} flex items-center justify-center rounded-full font-medium text-white`}
      aria-label={key}
    >
      {letter}
    </span>
  );
}
