"use client";
// @ts-ignore
import { Editor } from "novel";

export default function NovelEditor({ initialValue, onChange }: { initialValue?: string, onChange: (content: string) => void }) {
  return (
    <div className="relative w-full max-w-screen-lg border border-gray-200 rounded-lg p-12 bg-white sm:mb-calc(20vh) sm:rounded-lg sm:border sm:shadow-lg" style={{ minHeight: '500px' }}>
      <Editor
        defaultValue={initialValue || ""}
        onUpdate={(editor: any) => {
          onChange(editor?.getHTML() || "");
        }}
        disableLocalStorage={true}
      />
    </div>
  );
}
