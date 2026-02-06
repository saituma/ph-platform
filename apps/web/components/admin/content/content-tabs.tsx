"use client";

import { useMemo, useRef, useState } from "react";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select } from "../../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Textarea } from "../../ui/textarea";

type ContentTabsProps = {
  onSaveHome: () => void;
  onPublishParent: () => void;
  onSavePrograms: () => void;
  onSaveLegal: () => void;
};

export function ContentTabs({
  onSaveHome,
  onPublishParent,
  onSavePrograms,
  onSaveLegal,
}: ContentTabsProps) {
  const termsRef = useRef<HTMLTextAreaElement | null>(null);
  const privacyRef = useRef<HTMLTextAreaElement | null>(null);
  const [showTermsPreview, setShowTermsPreview] = useState(false);
  const [showPrivacyPreview, setShowPrivacyPreview] = useState(false);

  const insertAtCursor = (ref: React.RefObject<HTMLTextAreaElement>, value: string) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const text = el.value;
    el.value = text.slice(0, start) + value + text.slice(end);
    const cursor = start + value.length;
    el.focus();
    el.setSelectionRange(cursor, cursor);
  };

  const wrapSelection = (
    ref: React.RefObject<HTMLTextAreaElement>,
    prefix: string,
    suffix: string,
    placeholder = ""
  ) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const text = el.value;
    const selected = text.slice(start, end) || placeholder;
    const next = text.slice(0, start) + prefix + selected + suffix + text.slice(end);
    el.value = next;
    const cursorStart = start + prefix.length;
    const cursorEnd = cursorStart + selected.length;
    el.focus();
    el.setSelectionRange(cursorStart, cursorEnd);
  };

  const prefixLines = (
    ref: React.RefObject<HTMLTextAreaElement>,
    prefix: string,
    placeholder = ""
  ) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const text = el.value;
    const selected = text.slice(start, end) || placeholder;
    const lines = selected.split("\n").map((line) => `${prefix}${line}`);
    const next = text.slice(0, start) + lines.join("\n") + text.slice(end);
    el.value = next;
    el.focus();
    el.setSelectionRange(start, start + lines.join("\n").length);
  };

  const renderMarkdown = (text: string) => {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/_(.*?)_/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^\- (.*)$/gm, "<li>$1</li>")
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      .replace(/\n/g, "<br />");
  };

  const termsPreview = useMemo(
    () => renderMarkdown(termsRef.current?.value ?? ""),
    [showTermsPreview]
  );
  const privacyPreview = useMemo(
    () => renderMarkdown(privacyRef.current?.value ?? ""),
    [showPrivacyPreview]
  );

  const toolbar = [
    { label: "B", type: "wrap", prefix: "**", suffix: "**", placeholder: "bold" },
    { label: "I", type: "wrap", prefix: "_", suffix: "_", placeholder: "italic" },
    { label: "H1", type: "line", prefix: "# ", placeholder: "Heading 1" },
    { label: "H2", type: "line", prefix: "## ", placeholder: "Heading 2" },
    { label: "Link", type: "wrap", prefix: "[", suffix: "](https://)", placeholder: "label" },
    { label: "List", type: "line", prefix: "- ", placeholder: "Item" },
    { label: "Quote", type: "line", prefix: "> ", placeholder: "Quote" },
    { label: "Code", type: "wrap", prefix: "`", suffix: "`", placeholder: "code" },
  ] as const;

  return (
    <Tabs defaultValue="home">
      <TabsList>
        <TabsTrigger value="home">Home</TabsTrigger>
        <TabsTrigger value="parent">Parent Platform</TabsTrigger>
        <TabsTrigger value="programs">Programs</TabsTrigger>
        <TabsTrigger value="legal">Legal</TabsTrigger>
      </TabsList>
      <div className="flex gap-2 overflow-auto pb-1 md:hidden">
        {["Drafts", "Published", "Tier Filters", "Media"].map((chip) => (
          <Button
            key={chip}
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
          >
            {chip}
          </Button>
        ))}
      </div>
      <TabsContent value="home">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Coach Story</Label>
              <Textarea placeholder="Write the coach story..." />
            </div>
            <div className="space-y-2">
              <Label>Intro Video URL</Label>
              <Input placeholder="https://video" />
            </div>
            <div className="space-y-2">
              <Label>Testimonials</Label>
              <Textarea placeholder="Add testimonials..." />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hero Image</Label>
              <Input type="file" />
            </div>
            <div className="space-y-2">
              <Label>Display Tier</Label>
              <Select>
                <option>All tiers</option>
                <option>PHP Program</option>
                <option>PHP Plus</option>
                <option>PHP Premium</option>
              </Select>
            </div>
            <Button className="w-full" onClick={onSaveHome}>
              Save Updates
            </Button>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="parent">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Article Title</Label>
              <Input placeholder="New article title" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select>
                <option>Growth & Maturation</option>
                <option>Injury Prevention</option>
                <option>Nutrition</option>
                <option>Mindset</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea placeholder="Write the article..." />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Media</Label>
              <Input type="file" />
            </div>
            <div className="space-y-2">
              <Label>Access Tier</Label>
              <Select>
                <option>PHP Plus & Premium</option>
                <option>All tiers</option>
                <option>Premium only</option>
              </Select>
            </div>
            <Button className="w-full" onClick={onPublishParent}>
              Publish Article
            </Button>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="programs">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Program Card Title</Label>
              <Input placeholder="PHP Plus" />
            </div>
            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea placeholder="Short summary..." />
            </div>
            <div className="space-y-2">
              <Label>Included Features</Label>
              <Textarea placeholder="Bullets or sentences" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>CTA Label</Label>
              <Input placeholder="Apply now" />
            </div>
            <div className="space-y-2">
              <Label>CTA Behavior</Label>
              <Select>
                <option>View program</option>
                <option>Apply</option>
                <option>Start onboarding</option>
              </Select>
            </div>
            <Button className="w-full" onClick={onSavePrograms}>
              Save Program Card
            </Button>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="legal">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Terms & Conditions</Label>
            <div className="flex flex-wrap gap-2">
              {toolbar.map((item) => (
                <Button
                  key={`terms-${item.label}`}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (item.type === "wrap") {
                      wrapSelection(termsRef, item.prefix, item.suffix, item.placeholder);
                    } else {
                      prefixLines(termsRef, item.prefix, item.placeholder);
                    }
                  }}
                >
                  {item.label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTermsPreview((prev) => !prev)}
              >
                {showTermsPreview ? "Edit" : "Preview"}
              </Button>
            </div>
            {showTermsPreview ? (
              <div
                className="min-h-[200px] rounded-2xl border border-border bg-secondary/30 p-4 text-sm"
                dangerouslySetInnerHTML={{ __html: termsPreview }}
              />
            ) : (
              <Textarea ref={termsRef} placeholder="Paste legal content..." />
            )}
          </div>
          <div className="space-y-2">
            <Label>Privacy Policy</Label>
            <div className="flex flex-wrap gap-2">
              {toolbar.map((item) => (
                <Button
                  key={`privacy-${item.label}`}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (item.type === "wrap") {
                      wrapSelection(
                        privacyRef,
                        item.prefix,
                        item.suffix,
                        item.placeholder
                      );
                    } else {
                      prefixLines(privacyRef, item.prefix, item.placeholder);
                    }
                  }}
                >
                  {item.label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrivacyPreview((prev) => !prev)}
              >
                {showPrivacyPreview ? "Edit" : "Preview"}
              </Button>
            </div>
            {showPrivacyPreview ? (
              <div
                className="min-h-[200px] rounded-2xl border border-border bg-secondary/30 p-4 text-sm"
                dangerouslySetInnerHTML={{ __html: privacyPreview }}
              />
            ) : (
              <Textarea ref={privacyRef} placeholder="Paste policy content..." />
            )}
          </div>
          <Button className="w-full lg:col-span-2" onClick={onSaveLegal}>
            Save Legal
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
