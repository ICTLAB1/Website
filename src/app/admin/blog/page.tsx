import Link from "next/link";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Blog" };

export default async function AdminBlogPage() {
  await requireStaff();
  const posts = await prisma.blogPost.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: "asc" }, { publishedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      status: true,
      readMinutes: true,
      publishedAt: true,
      author: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Blog</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          Licensing and procurement articles published at /blog/[slug].
        </p>
      </header>

      {posts.length === 0 ? (
        <EmptyState title="No articles" description="Published articles appear here." />
      ) : (
        <TableWrap>
          <Table className="min-w-[44rem]">
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Author</Th>
                <Th>Read time</Th>
                <Th>Published</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <Tr key={post.id}>
                  <Td>
                    <span className="font-medium text-graphite-900">{post.title}</span>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="mt-0.5 block font-mono text-[11px] text-accent-700 hover:underline"
                    >
                      /blog/{post.slug}
                    </Link>
                  </Td>
                  <Td className="text-[13px]">{post.category}</Td>
                  <Td className="text-[13px]">{post.author?.name ?? "—"}</Td>
                  <Td className="tabular-nums">{post.readMinutes} min</Td>
                  <Td className="whitespace-nowrap text-[13px]">{formatDate(post.publishedAt)}</Td>
                  <Td>
                    <StatusBadge status={post.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}
