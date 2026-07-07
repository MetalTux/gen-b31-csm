// src/app/api/exportar-excel/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import ExcelJS from "exceljs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

const MONTHS_MAP: { [key: number]: string } = {
  1: "Marzo", 2: "Abril", 3: "Mayo", 4: "Junio", 5: "Julio",
  6: "Agosto", 7: "Septiembre", 8: "Octubre", 9: "Noviembre", 10: "Diciembre"
};

export async function GET() {
  try {
    // 1. Validar Sesión y Rol de Admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse("No autorizado", { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (user?.role !== "ADMIN") {
      return new NextResponse("Prohibido", { status: 403 });
    }

    // 2. Extraer Año Activo, Alumnos y Pagos
    const activeYear = await prisma.schoolYear.findFirst({
      where: { isActive: true },
      include: { extraFees: true }
    });

    if (!activeYear) {
      return new NextResponse("No hay año escolar activo", { status: 404 });
    }

    const students = await prisma.student.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    });

    const payments = await prisma.payment.findMany({
      where: { schoolYearId: activeYear.id }
    });

    // 3. Cálculos Globales para el Dashboard
    let totalExpectedQuotas = 0;
    students.forEach(s => {
      const monthsToPay = (activeYear.totalQuotas - s.startQuotaNumber) + 1;
      totalExpectedQuotas += Math.max(0, monthsToPay * activeYear.quotaAmount);
    });

    const verifiedPayments = payments.filter(p => p.isVerified);
    const totalRecaudadoCuotas = verifiedPayments.filter(p => p.quotaNumber !== null).reduce((sum, p) => sum + p.amount, 0);
    const totalPendienteCuotas = Math.max(0, totalExpectedQuotas - totalRecaudadoCuotas);

    const recaudadoTransferencia = verifiedPayments.filter(p => p.receiptUrl !== "EFECTIVO").reduce((sum, p) => sum + p.amount, 0);
    const recaudadoEfectivo = verifiedPayments.filter(p => p.receiptUrl === "EFECTIVO").reduce((sum, p) => sum + p.amount, 0);

    // 4. Inicializar Libro ExcelJS
    const workbook = new ExcelJS.Workbook();
    
    // ESTILOS COMPARTIDOS
    const fontTitle = { name: "Arial", size: 16, bold: true, color: { argb: "1B2A4A" } };
    const fontSubtitle = { name: "Arial", size: 10, italic: true, color: { argb: "5F6368" } };
    const fontHeader = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFF" } };
    const fillHeader = { type: "pattern", pattern: "solid", fgColor: { argb: "1B2A4A" } } as const;
    const borderThin = {
      top: { style: "thin" as const, color: { argb: "DDE2E5" } },
      left: { style: "thin" as const, color: { argb: "DDE2E5" } },
      bottom: { style: "thin" as const, color: { argb: "DDE2E5" } },
      right: { style: "thin" as const, color: { argb: "DDE2E5" } }
    };

    // --- PESTAÑA 1: RESUMEN GENERAL ---
    const wsResumen = workbook.addWorksheet("Resumen General", { views: [{ showGridLines: true }] });
    wsResumen.getCell("A1").value = "Panel de Control Financiero - Centro de Padres";
    wsResumen.getCell("A1").font = fontTitle;
    wsResumen.getCell("A2").value = `Estado global de recaudación año ${activeYear.year}`;
    wsResumen.getCell("A2").font = fontSubtitle;

    // ASIGNACIÓN DE ANCHOS EXPLICITOS PARA EVITAR TEXTO CORTADO EN KPIs Y TABLAS
    wsResumen.getColumn("B").width = 42; // Columna para "Vía de Pago" y el KPI 1
    wsResumen.getColumn("C").width = 22; // Columna para "Monto Recaudado"
    wsResumen.getColumn("D").width = 16; // Columna para "% del Total"
    wsResumen.getColumn("E").width = 26; // Columna para el KPI 2 (Total Presupuestado)
    wsResumen.getColumn("H").width = 32; // Columna para el KPI 3 (Total por Cobrar)

    const kpis = [
      { cellLabel: "B4", cellVal: "B5", label: "Total Recaudado (Cuotas)", val: totalRecaudadoCuotas },
      { cellLabel: "E4", cellVal: "E5", label: "Total Presupuestado", val: totalExpectedQuotas },
      { cellLabel: "H4", cellVal: "H5", label: "Total por Cobrar (Pendiente)", val: totalPendienteCuotas }
    ];

    kpis.forEach(k => {
      wsResumen.getCell(k.cellLabel).value = k.label;
      wsResumen.getCell(k.cellLabel).font = { name: "Arial", size: 9, bold: true, color: { argb: "5F6368" } };
      wsResumen.getCell(k.cellLabel).alignment = { horizontal: "center", vertical: "middle" };
      wsResumen.getCell(k.cellLabel).border = borderThin;

      wsResumen.getCell(k.cellVal).value = k.val;
      wsResumen.getCell(k.cellVal).font = { name: "Arial", size: 18, bold: true, color: { argb: "1B2A4A" } };
      wsResumen.getCell(k.cellVal).numFmt = "$#,##0";
      wsResumen.getCell(k.cellVal).alignment = { horizontal: "center", vertical: "middle" };
      wsResumen.getCell(k.cellVal).border = borderThin;
    });

    wsResumen.getCell("B8").value = "Auditoría de Fondos por Vía de Ingreso";
    wsResumen.getCell("B8").font = { name: "Arial", size: 12, bold: true, color: { argb: "1B2A4A" } };

    // SOLUCIÓN AL DESPLAZAMIENTO: Ahora los títulos empiezan estrictamente en la Columna 2 (B)
    const headersVia = ["Vía de Pago", "Monto Recaudado", "% del Total"];
    headersVia.forEach((h, idx) => {
      const cell = wsResumen.getCell(9, idx + 2); // idx + 2 evalúa columnas 2(B), 3(C) y 4(D)
      cell.value = h;
      cell.font = fontHeader;
      cell.fill = fillHeader;
      cell.alignment = { horizontal: "center" };
    });

    // POBLAR DATOS DE LA TABLA EN COLUMNAS B, C y D
    wsResumen.getCell("B10").value = "🏦 Transferencias Bancarias (Verificadas)";
    wsResumen.getCell("C10").value = recaudadoTransferencia;
    wsResumen.getCell("C10").numFmt = "$#,##0";
    // SOLUCIÓN A LAS FÓRMULAS: Pasamos un objeto con la propiedad 'formula'
    wsResumen.getCell("D10").value = { formula: "C10/C12" };
    wsResumen.getCell("D10").numFmt = "0.0%";

    wsResumen.getCell("B11").value = "💵 Efectivo / Recaudación Presencial";
    wsResumen.getCell("C11").value = recaudadoEfectivo;
    wsResumen.getCell("C11").numFmt = "$#,##0";
    wsResumen.getCell("D11").value = { formula: "C11/C12" };
    wsResumen.getCell("D11").numFmt = "0.0%";

    // Aplicar tipografía y bordes del cuerpo de la tabla
    [10, 11].forEach(r => {
      for (let col = 2; col <= 4; col++) {
        const cell = wsResumen.getCell(r, col);
        cell.border = borderThin;
        cell.font = { name: "Arial", size: 10 };
      }
    });

    // FILA DE TOTALES DE LA TABLA (Fórmulas reales)
    wsResumen.getCell("B12").value = "Total General";
    wsResumen.getCell("B12").font = { name: "Arial", size: 11, bold: true };
    
    wsResumen.getCell("C12").value = { formula: "SUM(C10:C11)" };
    wsResumen.getCell("C12").font = { name: "Arial", size: 11, bold: true };
    wsResumen.getCell("C12").numFmt = "$#,##0";
    
    wsResumen.getCell("D12").value = { formula: "SUM(D10:D11)" };
    wsResumen.getCell("D12").font = { name: "Arial", size: 11, bold: true };
    wsResumen.getCell("D12").numFmt = "0.0%";
    
    ["B12", "C12", "D12"].forEach(c => wsResumen.getCell(c).border = borderThin);


    // --- PESTAÑA 2: MATRIZ DE CUOTAS ---
    const wsCuotas = workbook.addWorksheet("Cuotas Mensuales", { views: [{ showGridLines: true }] });
    wsCuotas.getCell("A1").value = "Matriz General de Cuotas Mensuales";
    wsCuotas.getCell("A1").font = fontTitle;
    wsCuotas.getCell("A2").value = "Estado pormenorizado de mensualidades obligatorias (Marzo - Diciembre)";
    wsCuotas.getCell("A2").font = fontSubtitle;

    const monthsArr = Array.from({ length: activeYear.totalQuotas }).map((_, i) => MONTHS_MAP[i + 1]);
    const headersCuotas = ["N°", "Alumno (Apellido, Nombre)", "Mes Ingreso"]
      .concat(monthsArr)
      .concat(["Pagados", "Pendientes", "Exentos"]);

    headersCuotas.forEach((h, idx) => {
      const cell = wsCuotas.getCell(4, idx + 1);
      cell.value = h;
      cell.font = fontHeader;
      cell.fill = fillHeader;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    wsCuotas.getRow(4).height = 26;

    students.forEach((student, sIdx) => {
      const rowIdx = 5 + sIdx;
      wsCuotas.getCell(rowIdx, 1).value = sIdx + 1;
      wsCuotas.getCell(rowIdx, 1).alignment = { horizontal: "center" };
      wsCuotas.getCell(rowIdx, 2).value = `${student.lastName}, ${student.firstName}`;
      wsCuotas.getCell(rowIdx, 3).value = MONTHS_MAP[student.startQuotaNumber] || "Marzo";
      wsCuotas.getCell(rowIdx, 3).alignment = { horizontal: "center" };

      const studentPayments = verifiedPayments.filter(p => p.studentId === student.id && p.quotaNumber !== null);

      for (let m = 1; m <= activeYear.totalQuotas; m++) {
        const colIdx = 3 + m;
        const cell = wsCuotas.getCell(rowIdx, colIdx);
        cell.alignment = { horizontal: "center" };

        if (m < student.startQuotaNumber) {
          cell.value = "Exento";
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F3F4" } };
          cell.font = { name: "Arial", size: 10, italic: true, color: { argb: "5F6368" } };
        } else {
          const hasPaid = studentPayments.some(p => p.quotaNumber === m);
          if (hasPaid) {
            cell.value = "Pagado";
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E6F4EA" } };
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "137333" } };
          } else {
            cell.value = "Pendiente";
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FCE8E6" } };
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "C5221F" } };
          }
        }
      }

      const startLetter = "D";
      const endLetter = String.fromCharCode(67 + activeYear.totalQuotas); 
      const pagCol = 4 + activeYear.totalQuotas;
      const penCol = 5 + activeYear.totalQuotas;
      const exeCol = 6 + activeYear.totalQuotas;

      wsCuotas.getCell(rowIdx, pagCol).value = { formula: `COUNTIF(${startLetter}${rowIdx}:${endLetter}${rowIdx}, "Pagado")`, result: 0 };
      wsCuotas.getCell(rowIdx, penCol).value = { formula: `COUNTIF(${startLetter}${rowIdx}:${endLetter}${rowIdx}, "Pendiente")`, result: 0 };
      wsCuotas.getCell(rowIdx, exeCol).value = { formula: `COUNTIF(${startLetter}${rowIdx}:${endLetter}${rowIdx}, "Exento")`, result: 0 };

      [pagCol, penCol, exeCol].forEach(c => {
        const cell = wsCuotas.getCell(rowIdx, c);
        cell.font = { name: "Arial", size: 10, bold: true };
        cell.alignment = { horizontal: "center" };
      });

      for (let col = 1; col <= exeCol; col++) {
        const cell = wsCuotas.getCell(rowIdx, col);
        cell.border = borderThin;
        if (rowIdx % 2 === 0 && (!cell.fill || cell.fill.type !== "pattern")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } };
        }
      }
    });

    wsCuotas.getColumn(1).width = 5;
    wsCuotas.getColumn(2).width = 30;
    wsCuotas.getColumn(3).width = 15;
    for (let col = 4; col <= 4 + activeYear.totalQuotas + 2; col++) {
      wsCuotas.getColumn(col).width = 13;
    }


    // --- PESTAÑA 3: COBROS EXTRAORDINARIOS ---
    const wsExtras = workbook.addWorksheet("Cobros Extras", { views: [{ showGridLines: true }] });
    wsExtras.getCell("A1").value = "Matriz de Cobros Extraordinarios y Eventos";
    wsExtras.getCell("A1").font = fontTitle;
    wsExtras.getCell("A2").value = "Control de recaudación de fondos especiales, rifas y cuotas extraordinarias";
    wsExtras.getCell("A2").font = fontSubtitle; 

    const headersExtras = ["N°", "Alumno (Apellido, Nombre)"]
      .concat(activeYear.extraFees.map(f => `${f.title}\n($${f.amount.toLocaleString("es-CL")})`));

    headersExtras.forEach((h, idx) => {
      const cell = wsExtras.getCell(4, idx + 1);
      cell.value = h;
      cell.font = fontHeader;
      cell.fill = fillHeader;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    wsExtras.getRow(4).height = 28;

    students.forEach((student, sIdx) => {
      const rowIdx = 5 + sIdx;
      wsExtras.getCell(rowIdx, 1).value = sIdx + 1;
      wsExtras.getCell(rowIdx, 1).alignment = { horizontal: "center" };
      wsExtras.getCell(rowIdx, 2).value = `${student.lastName}, ${student.firstName}`;

      activeYear.extraFees.forEach((fee, fIdx) => {
        const colIdx = 3 + fIdx;
        const cell = wsExtras.getCell(rowIdx, colIdx);
        cell.alignment = { horizontal: "center" };

        const hasPaidExtra = verifiedPayments.some(p => p.studentId === student.id && p.extraFeeId === fee.id);
        if (hasPaidExtra) {
          cell.value = "Pagado";
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E6F4EA" } };
          cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "137333" } };
        } else {
          cell.value = "Pendiente";
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FCE8E6" } };
          cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "C5221F" } };
        }
      });

      const totalColsExtras = 2 + activeYear.extraFees.length;
      for (let col = 1; col <= totalColsExtras; col++) {
        const cell = wsExtras.getCell(rowIdx, col);
        cell.border = borderThin;
        if (rowIdx % 2 === 0 && (!cell.fill || cell.fill.type !== "pattern")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } };
        }
      }
    });

    wsExtras.getColumn(1).width = 5;
    wsExtras.getColumn(2).width = 30;
    activeYear.extraFees.forEach((_, fIdx) => {
      wsExtras.getColumn(3 + fIdx).width = 22;
    });

    // 5. Compilar y Enviar Búfer Binario
    const buffer = await workbook.xlsx.writeBuffer();
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reporte_centro_padres_${activeYear.year}.xlsx"`
      }
    });

  } catch (error) {
    console.error("Error crítico generando reporte Excel:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}