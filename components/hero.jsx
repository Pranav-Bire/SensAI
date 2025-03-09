"use client";


import Link from "next/link";
import { Button } from "./ui/button";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const HeroSection = () => {

const imageRef = useRef(null);
const { isSignedIn, isLoaded } = useAuth();
const router = useRouter();


useEffect(() => {

const imageElement = imageRef.current;

const handleScroll = () => {
const scrollPosition = window.scrollY;
const scrollThreshold = 100;

if (scrollPosition > scrollThreshold) {
    imageElement.classList.add("scrolled");
} 
else{
    imageElement.classList.remove("scrolled");
}
}; 

window.addEventListener("scroll", handleScroll);
return () => window.removeEventListener("scroll", handleScroll);

}, []);

const handleKnowMoreClick = (e) => {
    e.preventDefault();
    if (isLoaded) {
      if (isSignedIn) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    }
  };

    return (
        <section className="w-full pt-36 md:pt-48 pb-10">
            <div className="space-y-6 text-center">

                <div className="space-y-6 mx-auto">
                    <h1 className=" text-5xl font-bold md:text-6xl lg:text-7xl xl:text-8xl gradient-title">
                        Your AI Career Coach For
                        <br/>
                        Professional Success
                    </h1>

                    <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
                        Advance your career with the personalised guidence, interview prep, and 
                        AI-powered tools for job success.
                    </p>
                </div>


                <div className=" flex justify-center space-x-4">
                    <Link href="/dashboard">
                        <Button size="lg" className="px-8"> Get Started</Button>
                    </Link>


                    <Button 
                        size="lg" 
                        className="px-8" 
                        variant="outline"
                        onClick={handleKnowMoreClick}
                    >
                        Know More
                    </Button>
                </div>


                <div className="hero-image-wrapper mt-5 md:mt-0">
                    <div ref={imageRef} className="hero-image">
                        <Image
                        src = {"/banner.jpeg"}
                        width={1280}
                        height={720}
                        alt="SensAI Banner"
                        className="rounded-lg shadow-2xl border mx-auto"
                        priority/>
                    </div>
                </div>
            </div>
        </section>
    );
};


export default HeroSection;