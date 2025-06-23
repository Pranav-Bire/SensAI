"use client";

import React, { useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";

const CoverLetterPreview = ({ content, onSave }) => {
  const [editMode, setEditMode] = useState(false);
  const [value, setValue] = useState(content);

  const handleSave = () => {
    setEditMode(false);
    if (onSave) onSave(value);
  };

  return (
    <div className="py-4">
      {editMode ? (
        <>
          <MDEditor value={value} onChange={setValue} height={700} />
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSave} variant="primary">
              Save
            </Button>
            <Button
              onClick={() => setEditMode(false)}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <MDEditor value={value} preview="preview" height={700} />
          <Button
            className="mt-4"
            onClick={() => setEditMode(true)}
            variant="secondary"
          >
            Edit Cover Letter
          </Button>
        </>
      )}
    </div>
  );
};

export default CoverLetterPreview;