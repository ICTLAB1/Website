import Link from "next/link";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Services" };

export default async function AdminServicesPage() {
  await requireStaff();
  const services = await prisma.service.findMany({
    where: { deletedAt: null },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      published: true,
      featured: true,
      updatedAt: true,
      _count: { select: { faqs: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Services</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          Service pages published at /services/[slug].
        </p>
      </header>

      <TableWrap>
        <Table className="min-w-[42rem]">
          <thead>
            <tr>
              <Th>Service</Th>
              <Th>Category</Th>
              <Th>FAQs</Th>
              <Th>Updated</Th>
              <Th>State</Th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <Tr key={service.id}>
                <Td>
                  <span className="font-medium text-graphite-900">{service.name}</span>
                  <Link
                    href={`/services/${service.slug}`}
                    className="mt-0.5 block font-mono text-[11px] text-accent-700 hover:underline"
                  >
                    /services/{service.slug}
                  </Link>
                </Td>
                <Td className="text-[13px]">{service.category}</Td>
                <Td className="tabular-nums">{service._count.faqs}</Td>
                <Td className="whitespace-nowrap text-[13px]">{formatDate(service.updatedAt)}</Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge tone={service.published ? "success" : "neutral"}>
                      {service.published ? "Published" : "Draft"}
                    </Badge>
                    {service.featured ? <Badge tone="brand">Featured</Badge> : null}
                  </span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
