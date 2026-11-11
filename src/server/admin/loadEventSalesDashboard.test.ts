import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import {
  ADMIN_SALES_DB_PAGE_SIZE,
  loadEventSalesDashboard,
  organizerLabelFromMetadata,
  selectAllRows,
} from "@/server/admin/loadEventSalesDashboard";

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const NOW = new Date("2026-11-11T12:00:00.000Z");

function rangeResult(rows: unknown[]) {
  return {
    select(columns: string) {
      return {
        order() {
          return {
            range(from: number, to: number) {
              return Promise.resolve({
                data: rows.slice(from, to + 1),
                error: null,
                columns,
              });
            },
          };
        },
      };
    },
  };
}

describe("organizerLabelFromMetadata", () => {
  it("uses the company or person name and never an email", () => {
    expect(organizerLabelFromMetadata({ company_name: "  Durban Jazz Co ", email: "a@b.com" })).toBe(
      "Durban Jazz Co"
    );
    expect(organizerLabelFromMetadata({ name: "Ada", surname: "Lovelace" })).toBe("Ada Lovelace");
    expect(organizerLabelFromMetadata({ email: "only@example.com" })).toBe("Name not on file");
  });
});

describe("selectAllRows", () => {
  it("continues after a full 1000-row page", async () => {
    const rows = Array.from({ length: ADMIN_SALES_DB_PAGE_SIZE + 1 }, (_, index) => index);
    const loaded = await selectAllRows((from, to) =>
      Promise.resolve({ data: rows.slice(from, to + 1), error: null })
    );
    expect(loaded).toHaveLength(ADMIN_SALES_DB_PAGE_SIZE + 1);
    expect(loaded.at(-1)).toBe(ADMIN_SALES_DB_PAGE_SIZE);
  });

  it("fails closed when a page errors instead of returning a short total", async () => {
    await expect(
      selectAllRows(() => Promise.resolve({ data: null, error: { message: "relation missing" } }))
    ).rejects.toThrow("Failed to load event sales");
  });
});

describe("loadEventSalesDashboard", () => {
  const selects: string[] = [];

  beforeEach(() => {
    selects.length = 0;
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("pages every paid ticket, labels organisers, and drops buyer data", async () => {
    const tickets = Array.from({ length: ADMIN_SALES_DB_PAGE_SIZE + 1 }, (_, index) => ({
      id: `t-${index}`,
      event_id: "evt-a",
      payment_status: "paid",
      paystack_reference: index === 0 ? null : "ref-late",
      email: "buyer-secret@example.com",
      qr_code_data: "TICKET-SECRET",
    }));
    tickets.push({
      id: "t-other",
      event_id: "evt-b",
      payment_status: "paid",
      paystack_reference: "ref-b",
      email: "buyer-secret@example.com",
      qr_code_data: "TICKET-SECRET",
    });

    const events = [
      {
        id: "evt-a",
        title: "Durban Jazz",
        date: "2026-12-01T18:00:00.000Z",
        organizer_id: "org-a",
        price: 9999,
      },
      {
        id: "evt-b",
        title: "Cape Market",
        date: "2024-01-01T18:00:00.000Z",
        organizer_id: "org-b",
        price: 50,
      },
    ];
    const receipts = [
      {
        reference: "ref-b",
        event_id: "evt-b",
        payload: {
          currency: "ZAR",
          face_value_zar: 50,
          platform_fee_zar: 10,
          collected_zar: 60,
          ticket_count: 1,
          ticket_user: { email: "buyer-secret@example.com" },
        },
      },
    ];

    const getUserById = vi.fn(async (id: string) => ({
      data: {
        user: {
          id,
          email: "hidden-organiser@example.com",
          user_metadata: {
            company_name: id === "org-a" ? "Durban Jazz Co" : "Cape Market Co",
          },
        },
      },
      error: null,
    }));

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: { admin: { getUserById } },
      from(table: string) {
        const rows =
      table === "events" ? events : table === "tickets" ? tickets : table === "ticket_types" ? [
        {
          id: "tt-general",
          event_id: "evt-a",
          name: "General",
          price: 40,
          quantity: 100,
          available_quantity: 90,
        },
      ] : receipts;
        const query = rangeResult(rows);
        const original = query.select.bind(query);
        query.select = (columns: string) => {
          selects.push(`${table}:${columns}`);
          return original(columns);
        };
        return query;
      },
    } as never);

    const report = await loadEventSalesDashboard({ search: "", when: "all", page: 1, now: NOW });
    const serialized = JSON.stringify(report);

    expect(report.totals.paidTickets).toBe(ADMIN_SALES_DB_PAGE_SIZE + 2);
    expect(report.totals.moneyStatus).toBe("incomplete");
    expect(report.totals.faceValueZar).toBeNull();
    expect(report.totals.verifiedCollectedZar).toBe(60);
    expect(report.events.map((event) => event.organizerLabel)).toEqual([
      "Durban Jazz Co",
      "Cape Market Co",
    ]);
    expect(getUserById).toHaveBeenCalledTimes(2);
    expect(serialized).not.toContain("buyer-secret@example.com");
    expect(serialized).not.toContain("hidden-organiser@example.com");
    expect(serialized).not.toContain("TICKET-SECRET");
    expect(serialized).not.toContain("organizerId");
    expect(serialized).not.toContain("9999");
    expect(report.events[0]?.ticketTypes).toEqual([
      {
        id: "tt-general",
        name: "General",
        listPriceZar: 40,
        quantity: 100,
        availableQuantity: 90,
      },
    ]);
    expect(report.totals.listedTicketTypes).toBe(1);
    expect(selects).toEqual([
      "events:id, title, date, organizer_id",
      "tickets:id, event_id, payment_status, paystack_reference",
      "payment_receipts:reference, event_id, payload",
      "ticket_types:id, event_id, name, price, quantity, available_quantity",
      "tickets:id, event_id, payment_status, paystack_reference",
    ]);
  });
});
