import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { ChatBox } from "@/components/ChatBox";
import { tools } from "@/lib/tools";

const tool = tools.find((t) => t.slug === "text-summarizer")!;

const TextSummarizer = () => {
  return (
    <Layout>
      <div className="container max-w-3xl py-8 md:py-12">
        <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />
        <ChatBox />
      </div>
    </Layout>
  );
};

export default TextSummarizer;
