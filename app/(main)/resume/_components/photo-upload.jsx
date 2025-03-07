"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import Image from "next/image";

export default function PhotoUpload({ value, onChange }) {
  const [previewUrl, setPreviewUrl] = useState(value || "");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setPreviewUrl(dataUrl);
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreviewUrl("");
    onChange("");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {previewUrl ? (
        <div className="relative">
          <Image
            src={previewUrl}
            alt="Profile photo"
            width={150}
            height={150}
            className="rounded-full object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="w-[150px] h-[150px] rounded-full bg-muted flex items-center justify-center">
          <Camera className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="photo-upload"
          onChange={handleFileChange}
        />
        <label htmlFor="photo-upload">
          <Button variant="outline" className="cursor-pointer" asChild>
            <span>Upload Photo</span>
          </Button>
        </label>
      </div>
    </div>
  );
}
