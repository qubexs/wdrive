"use client";
import React, { useState } from "react";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import UserInfo from "./UserInfo";
import AppLauncher from "./AppLauncher";
import Link from "next/link";
import Search from "./Search";
import UserAvatar from "@/components/UserAvatar";

function Header() {
  const [displayUserInfo, setDisplayUserInfo] = useState(false);
  const [displayApps, setDisplayApps] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  return (
    <header className="relative flex h-16 w-screen items-center justify-between px-5 py-2">
      <div className="w-16 pl-1 duration-500 tablet:w-60">
        <Link href={"/"} className="flex w-fit items-center space-x-2 p-1">
          <Image
            src={`${router.basePath}/wpre.png`}
            width={500}
            height={500}
            alt="logo"
            className="h-10 w-10 object-contain object-center"
            draggable={false}
          />
          <h1 className="hidden text-2xl tracking-tight text-textC tablet:block">
            Intranet
          </h1>
        </Link>
      </div>
      {/* search */}
      <Search />
      <div className="flex items-center gap-1">
        <AppLauncher
          open={displayApps}
          onToggle={() => {
            setDisplayApps((prev) => !prev);
            setDisplayUserInfo(false);
          }}
          onClose={() => setDisplayApps(false)}
        />
        <div
          onClick={() => {
            if (status === "authenticated") {
              setDisplayUserInfo((prev) => !prev);
              setDisplayApps(false);
              return;
            }

            void signIn();
          }}
          className="h-8 w-8 cursor-pointer overflow-hidden rounded-full"
        >
          <UserAvatar
            name={session?.user?.name}
            email={session?.user?.email}
            image={session?.user?.image}
          />
        </div>
      </div>
      <div className="absolute right-5 top-16">
        {session && displayUserInfo && (
          <UserInfo setDisplayUserInfo={setDisplayUserInfo} />
        )}
      </div>
    </header>
  );
}

export default Header;
