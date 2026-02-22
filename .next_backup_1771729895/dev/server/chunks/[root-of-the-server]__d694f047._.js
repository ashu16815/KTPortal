module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/lib/prisma.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "prisma",
    ()=>prisma
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
;
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]({
    log: ("TURBOPACK compile-time truthy", 1) ? [
        'query',
        'error',
        'warn'
    ] : "TURBOPACK unreachable"
});
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = prisma;
}),
"[project]/src/lib/utils.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn,
    "csvExport",
    ()=>csvExport,
    "formatDate",
    ()=>formatDate,
    "formatScore",
    ()=>formatScore,
    "getCurrentWeekEnding",
    ()=>getCurrentWeekEnding,
    "normaliseWeekEnding",
    ()=>normaliseWeekEnding,
    "ragBg",
    ()=>ragBg,
    "ragColor",
    ()=>ragColor,
    "safeParseJSON",
    ()=>safeParseJSON
]);
function normaliseWeekEnding(date) {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    // 0=Sun,1=Mon,...,5=Fri,6=Sat
    const day = d.getDay();
    const diff = day <= 5 ? 5 - day : 6 // if Saturday, go forward 6 to next Friday
    ;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}
function formatScore(score) {
    return `${score}/100`;
}
function ragColor(rag) {
    switch(rag){
        case 'GREEN':
            return '#16a34a';
        case 'AMBER':
            return '#d97706';
        case 'RED':
            return '#dc2626';
    }
}
function ragBg(rag) {
    switch(rag){
        case 'GREEN':
            return 'bg-green-100 text-green-800';
        case 'AMBER':
            return 'bg-amber-100 text-amber-800';
        case 'RED':
            return 'bg-red-100 text-red-800';
    }
}
function formatDate(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
function csvExport(headers, rows) {
    const escape = (v)=>{
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
        headers.map(escape).join(','),
        ...rows.map((r)=>r.map(escape).join(','))
    ];
    return lines.join('\n');
}
function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
function safeParseJSON(json, fallback) {
    if (!json) return fallback;
    try {
        return JSON.parse(json);
    } catch  {
        return fallback;
    }
}
function getCurrentWeekEnding() {
    return normaliseWeekEnding(new Date());
}
}),
"[project]/src/app/api/dashboard/tower/[id]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/prisma.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-route] (ecmascript)");
;
;
;
async function GET(request, { params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const weekEndingStr = searchParams.get('weekEnding');
        const weekEnding = weekEndingStr ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normaliseWeekEnding"])(weekEndingStr) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normaliseWeekEnding"])(new Date());
        const tower = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].tower.findUnique({
            where: {
                id
            }
        });
        if (!tower) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: {
                code: 'NOT_FOUND',
                message: 'Tower not found'
            }
        }, {
            status: 404
        });
        const [tracks, latestTwg, latestTcs, trend, actions, artefacts, pendingDecisions] = await Promise.all([
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].track.findMany({
                where: {
                    towerId: id
                },
                orderBy: {
                    name: 'asc'
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].weeklySubmission.findUnique({
                where: {
                    towerId_weekEnding_org: {
                        towerId: id,
                        weekEnding,
                        org: 'TWG'
                    }
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].weeklySubmission.findUnique({
                where: {
                    towerId_weekEnding_org: {
                        towerId: id,
                        weekEnding,
                        org: 'TCS'
                    }
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].healthScoreHistory.findMany({
                where: {
                    towerId: id
                },
                orderBy: {
                    weekEnding: 'asc'
                },
                take: 8
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].action.findMany({
                where: {
                    towerId: id
                },
                include: {
                    owner: {
                        select: {
                            name: true
                        }
                    },
                    tower: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: {
                    dueDate: 'asc'
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].artefact.findMany({
                where: {
                    towerId: id
                },
                orderBy: {
                    type: 'asc'
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].decision.findMany({
                where: {
                    towerId: id,
                    status: 'PENDING'
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })
        ]);
        const mapSub = (s)=>s ? {
                ...s,
                weekEnding: s.weekEnding.toISOString(),
                createdAt: s.createdAt.toISOString(),
                updatedAt: s.updatedAt.toISOString(),
                risks: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["safeParseJSON"])(s.risks, []),
                blockers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["safeParseJSON"])(s.blockers, []),
                evidenceLinks: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["safeParseJSON"])(s.evidenceLinks, [])
            } : undefined;
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            data: {
                tower: {
                    id: tower.id,
                    name: tower.name,
                    description: tower.description,
                    createdAt: tower.createdAt.toISOString()
                },
                tracks,
                latestTwg: mapSub(latestTwg),
                latestTcs: mapSub(latestTcs),
                trend: trend.map((t)=>({
                        ...t,
                        weekEnding: t.weekEnding.toISOString(),
                        createdAt: t.createdAt.toISOString(),
                        updatedAt: t.updatedAt.toISOString()
                    })),
                actions: actions.map((a)=>({
                        ...a,
                        ownerName: a.owner.name,
                        towerName: a.tower.name,
                        dueDate: a.dueDate?.toISOString(),
                        resolvedAt: a.resolvedAt?.toISOString(),
                        createdAt: a.createdAt.toISOString(),
                        updatedAt: a.updatedAt.toISOString(),
                        owner: undefined,
                        tower: undefined
                    })),
                artefacts: artefacts.map((a)=>({
                        ...a,
                        uploadedAt: a.uploadedAt?.toISOString(),
                        createdAt: a.createdAt.toISOString()
                    })),
                pendingDecisions: pendingDecisions.map((d)=>({
                        ...d,
                        decidedAt: d.decidedAt?.toISOString(),
                        createdAt: d.createdAt.toISOString(),
                        updatedAt: d.updatedAt.toISOString()
                    })),
                weekEnding: weekEnding.toISOString()
            }
        });
    } catch (err) {
        console.error(err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: {
                code: 'INTERNAL',
                message: 'Failed to load tower dashboard'
            }
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__d694f047._.js.map