(function() {
    console.log("Controlador de Dashboard conectado a API MySQL Iniciado");

    const kpiIngresos = document.getElementById('kpi-ingresos');
    const kpiOcupacion = document.getElementById('kpi-ocupacion');
    const kpiOcupacionTxt = document.getElementById('kpi-ocupacion-txt');
    const kpiOcupacionCircle = document.getElementById('kpi-ocupacion-circle');
    const kpiClientes = document.getElementById('kpi-clientes');
    const kpiStock = document.getElementById('kpi-stock');
    const kpiUltimasCajas = document.getElementById('kpi-ultimas-cajas');

    async function cargarDashboardDesdeAPI() {
        try {
            const res = await fetch('../api/dashboard.php');
            if (!res.ok) throw new Error("Error al obtener datos del dashboard");
            const data = await res.json();

            // 1. Ingresos Totales
            const totalIngresos = parseFloat(data.ingresosTotales || 0);
            if (kpiIngresos) kpiIngresos.textContent = `$${totalIngresos.toLocaleString('es-AR')}`;

            // 2. Ocupación Promedio
            const ocupacion = parseInt(data.ocupacionPromedio || 0);
            if (kpiOcupacion) kpiOcupacion.textContent = `${ocupacion}%`;
            if (kpiOcupacionTxt) kpiOcupacionTxt.textContent = `${ocupacion}%`;
            if (kpiOcupacionCircle) kpiOcupacionCircle.setAttribute('stroke-dasharray', `${ocupacion}, 100`);

            // 3. Clientes Registrados
            if (kpiClientes) kpiClientes.textContent = data.nuevosClientes || 0;

            // 4. Alertas de Stock Crítico
            if (kpiStock) kpiStock.textContent = data.alertasStock || 0;

            // 5. Tabla de Últimas Cajas y Movimientos
            if (kpiUltimasCajas) {
                kpiUltimasCajas.innerHTML = '';
                const movimientos = data.ultimasCajas || [];

                if (movimientos.length === 0) {
                    kpiUltimasCajas.innerHTML = `<tr><td colspan="5" class="px-6 py-6 text-center text-on-surface-variant font-medium">No hay movimientos registrados en la caja aún.</td></tr>`;
                    return;
                }

                movimientos.forEach(mov => {
                    const isIngreso = (mov.tipo === 'INGRESO' || mov.tipo === 'INGRESO_MP');
                    let tipoBadge = '';
                    let colorMonto = 'text-[#2e7d32]';
                    let signoMonto = '+$';

                    if (mov.tipo === 'INGRESO') {
                        tipoBadge = `<span class="inline-flex items-center gap-1 bg-[#e8f5e9] text-[#2e7d32] text-xs font-bold px-2.5 py-1 rounded-md">EFECTIVO</span>`;
                        colorMonto = 'text-[#2e7d32]';
                        signoMonto = '+$';
                    } else if (mov.tipo === 'INGRESO_MP') {
                        tipoBadge = `<span class="inline-flex items-center gap-1 bg-[#e3f2fd] text-[#1565c0] text-xs font-bold px-2.5 py-1 rounded-md">DIGITAL</span>`;
                        colorMonto = 'text-[#1565c0]';
                        signoMonto = '+$';
                    } else if (mov.tipo === 'RETIRO') {
                        tipoBadge = `<span class="inline-flex items-center gap-1 bg-[#ffebee] text-[#c62828] text-xs font-bold px-2.5 py-1 rounded-md">RETIRO</span>`;
                        colorMonto = 'text-[#c62828]';
                        signoMonto = '-$';
                    } else {
                        tipoBadge = `<span class="inline-flex items-center gap-1 bg-error-container/40 text-error text-xs font-bold px-2.5 py-1 rounded-md">EGRESO</span>`;
                        colorMonto = 'text-error';
                        signoMonto = '-$';
                    }

                    const nombreEmpleado = mov.empleado_nombre || "Empleado";
                    const iniciales = nombreEmpleado.substring(0, 2).toUpperCase();

                    let fechaStr = "Hoy";
                    if (mov.fecha_hora) {
                        const d = new Date(mov.fecha_hora.replace(' ', 'T'));
                        fechaStr = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' +
                                   d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' hs';
                    }

                    kpiUltimasCajas.innerHTML += `
                    <tr class="hover:bg-surface-container-low/50 transition-colors border-b border-surface-container-high/30 last:border-0">
                        <td class="px-6 py-4 font-medium text-on-surface">${fechaStr}</td>
                        <td class="px-6 py-4 flex items-center gap-2">
                            <div class="w-7 h-7 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center text-[11px] font-bold">
                                ${iniciales}
                            </div>
                            <span class="font-medium">${nombreEmpleado}</span>
                        </td>
                        <td class="px-6 py-4 text-on-surface-variant truncate max-w-[250px]" title="${mov.concepto}">${mov.concepto}</td>
                        <td class="px-6 py-4 font-bold ${colorMonto}">${signoMonto}${parseFloat(mov.monto || 0).toLocaleString('es-AR')}</td>
                        <td class="px-6 py-4 text-right">${tipoBadge}</td>
                    </tr>`;
                });
            }
        } catch (error) {
            console.error("Error al cargar datos del dashboard:", error);
            if (kpiUltimasCajas) {
                kpiUltimasCajas.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-error">Error al conectar con el servidor para obtener métricas.</td></tr>`;
            }
        }
    }

    cargarDashboardDesdeAPI();
})();