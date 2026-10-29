(function() {
    console.log("Controlador de Dashboard conectado a API MySQL Iniciado");

    const kpiIngresos = document.getElementById('kpi-ingresos');
    const kpiIngresosDetalle = document.getElementById('kpi-ingresos-detalle');
    const kpiOcupacion = document.getElementById('kpi-ocupacion');
    const kpiOcupacionTxt = document.getElementById('kpi-ocupacion-txt');
    const kpiOcupacionCircle = document.getElementById('kpi-ocupacion-circle');
    const kpiOcupacionDetalle = document.getElementById('kpi-ocupacion-detalle');
    const kpiClientes = document.getElementById('kpi-clientes');
    const kpiStock = document.getElementById('kpi-stock');
    const kpiUltimasCajas = document.getElementById('kpi-ultimas-cajas');
    const btnRefrescar = document.getElementById('btn-refrescar-dashboard');

    let estadoPrevio = {
        ingresos: 0,
        ocupacion: 0,
        clientes: 0,
        stock: 0
    };

    function animarNumero(elemento, valorInicial, valorFinal, formatoFn, duracion = 450) {
        if (!elemento) return;
        if (valorInicial === valorFinal) {
            elemento.textContent = formatoFn(valorFinal);
            return;
        }
        const inicio = performance.now();
        function paso(ahora) {
            const progreso = Math.min(1, (ahora - inicio) / duracion);
            const ease = 1 - Math.pow(1 - progreso, 3);
            const actual = valorInicial + (valorFinal - valorInicial) * ease;
            elemento.textContent = formatoFn(Math.round(actual));
            if (progreso < 1) {
                requestAnimationFrame(paso);
            } else {
                elemento.textContent = formatoFn(valorFinal);
            }
        }
        requestAnimationFrame(paso);
    }

    async function cargarDashboardDesdeAPI() {
        try {
            const res = await fetch('../api/dashboard.php');
            if (!res.ok) throw new Error("Error al obtener datos del dashboard");
            const data = await res.json();

            // Balance / Ingresos Totales (sube con ingresos, baja con egresos)
            const totalIngresos = parseFloat(data.ingresosTotales || 0);
            const ingresosBrutos = parseFloat(data.ingresosBrutos || 0);
            const egresosTotales = parseFloat(data.egresosTotales || 0);

            animarNumero(kpiIngresos, estadoPrevio.ingresos, totalIngresos, (v) => `$${v.toLocaleString('es-AR')}`);
            estadoPrevio.ingresos = totalIngresos;

            if (kpiIngresosDetalle) {
                kpiIngresosDetalle.textContent = `Ingresos: $${ingresosBrutos.toLocaleString('es-AR')} • Egresos: $${egresosTotales.toLocaleString('es-AR')}`;
            }

            // Ocupación Promedio (sube al reservar canchas, baja al cancelar/finalizar)
            const ocupacion = parseInt(data.ocupacionPromedio || 0);
            animarNumero(kpiOcupacion, estadoPrevio.ocupacion, ocupacion, (v) => `${v}%`);
            if (kpiOcupacionTxt) kpiOcupacionTxt.textContent = `${ocupacion}%`;
            if (kpiOcupacionCircle) kpiOcupacionCircle.setAttribute('stroke-dasharray', `${ocupacion}, 100`);
            estadoPrevio.ocupacion = ocupacion;

            if (kpiOcupacionDetalle) {
                const tActivos = parseInt(data.turnosActivos || 0);
                const cActivas = parseInt(data.canchasActivas || 2);
                kpiOcupacionDetalle.textContent = `${tActivos} ${tActivos === 1 ? 'turno confirmado' : 'turnos confirmados'} (${cActivas} canchas activas)`;
            }

            // Clientes Registrados Activos
            const clientes = parseInt(data.nuevosClientes || 0);
            animarNumero(kpiClientes, estadoPrevio.clientes, clientes, (v) => `${v}`);
            estadoPrevio.clientes = clientes;

            // Alertas de Stock Crítico
            const stockCritico = parseInt(data.alertasStock || 0);
            animarNumero(kpiStock, estadoPrevio.stock, stockCritico, (v) => `${v}`);
            estadoPrevio.stock = stockCritico;

            //  Gráfico de Barras: Facturación por Cancha
            if (data.ingresosPorCancha) {
                const c1 = parseFloat(data.ingresosPorCancha['1'] || 0);
                const c2 = parseFloat(data.ingresosPorCancha['2'] || 0);
                const c3 = parseFloat(data.ingresosPorCancha['3'] || 0);
                const maxCancha = Math.max(30000, c1, c2, c3);

                [
                    { id: 1, val: c1 },
                    { id: 2, val: c2 },
                    { id: 3, val: c3 }
                ].forEach(item => {
                    const elMonto = document.getElementById(`monto-barra-cancha-${item.id}`);
                    const elBarra = document.getElementById(`barra-cancha-${item.id}`);
                    if (elMonto) elMonto.textContent = `$${item.val.toLocaleString('es-AR')}`;
                    if (elBarra) {
                        const pct = item.val > 0 ? Math.max(12, Math.min(100, Math.round((item.val / maxCancha) * 100))) : 6;
                        elBarra.style.height = `${pct}%`;
                    }
                });
            }

            // Gráfico de Demanda por Franja Horaria
            if (data.horariosDemandados) {
                const d08 = parseInt(data.horariosDemandados['08:00'] || 0);
                const d12 = parseInt(data.horariosDemandados['12:00'] || 0);
                const d18 = parseInt(data.horariosDemandados['18:00'] || 0);
                const d21 = parseInt(data.horariosDemandados['21:00'] || 0);
                const maxDem = Math.max(4, d08, d12, d18, d21);

                [
                    { suf: '08', val: d08 },
                    { suf: '12', val: d12 },
                    { suf: '18', val: d18 },
                    { suf: '21', val: d21 }
                ].forEach(franja => {
                    const txt = document.getElementById(`txt-demanda-${franja.suf}`);
                    const bar = document.getElementById(`bar-demanda-${franja.suf}`);
                    if (txt) txt.textContent = `${franja.val} ${franja.val === 1 ? 'turno' : 'turnos'}`;
                    if (bar) {
                        const pct = franja.val > 0 ? Math.max(15, Math.min(100, Math.round((franja.val / maxDem) * 100))) : 6;
                        bar.style.width = `${pct}%`;
                    }
                });
            }

            // Tabla de Últimas Cajas y Movimientos
            if (kpiUltimasCajas) {
                kpiUltimasCajas.innerHTML = '';
                const movimientos = data.ultimasCajas || [];

                if (movimientos.length === 0) {
                    kpiUltimasCajas.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-on-surface-variant font-medium">No hay movimientos registrados en la caja aún.</td></tr>`;
                    return;
                }

                movimientos.forEach(mov => {
                    let tipoBadge = '';
                    let colorMonto = 'text-[#2e7d32]';
                    let signoMonto = '+$';

                    if (mov.tipo === 'INGRESO') {
                        tipoBadge = `<span class="inline-flex items-center justify-center bg-[#e8f5e9] text-[#2e7d32] text-xs font-bold px-3 py-1 rounded-md border border-[#4caf50]/20">EFECTIVO</span>`;
                        colorMonto = 'text-[#2e7d32]';
                        signoMonto = '+$';
                    } else if (mov.tipo === 'INGRESO_MP') {
                        tipoBadge = `<span class="inline-flex items-center justify-center bg-[#e3f2fd] text-[#1565c0] text-xs font-bold px-3 py-1 rounded-md border border-[#2196f3]/20">DIGITAL MP</span>`;
                        colorMonto = 'text-[#1565c0]';
                        signoMonto = '+$';
                    } else if (mov.tipo === 'RETIRO') {
                        tipoBadge = `<span class="inline-flex items-center justify-center bg-[#ffebee] text-[#c62828] text-xs font-bold px-3 py-1 rounded-md border border-[#ef5350]/20">RETIRO EFECTIVO</span>`;
                        colorMonto = 'text-[#c62828]';
                        signoMonto = '-$';
                    } else if (mov.tipo === 'RETIRO_MP' || mov.tipo === 'RETIRO_DIGITAL') {
                        tipoBadge = `<span class="inline-flex items-center justify-center bg-[#ede7f6] text-[#5e35b1] text-xs font-bold px-3 py-1 rounded-md border border-[#5e35b1]/20">RETIRO MP</span>`;
                        colorMonto = 'text-[#5e35b1]';
                        signoMonto = '-$';
                    } else {
                        tipoBadge = `<span class="inline-flex items-center justify-center bg-[#fff3e0] text-[#e65100] text-xs font-bold px-3 py-1 rounded-md border border-[#ffb74d]/30">EGRESO</span>`;
                        colorMonto = 'text-[#e65100]';
                        signoMonto = '-$';
                    }

                    const nombreEmpleado = mov.empleado_nombre || "Administrador";
                    const iniciales = nombreEmpleado.substring(0, 2).toUpperCase();

                    let fechaStr = "Hoy";
                    if (mov.fecha_hora) {
                        const d = new Date(mov.fecha_hora.replace(' ', 'T'));
                        fechaStr = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' • ' +
                                   d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' hs';
                    }

                    kpiUltimasCajas.innerHTML += `
                    <tr class="hover:bg-surface-container-low/60 transition-colors">
                        <td class="px-6 py-4 font-medium text-on-surface align-middle">${fechaStr}</td>
                        <td class="px-6 py-4 align-middle">
                            <div class="flex items-center gap-2.5">
                                <div class="w-7 h-7 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                                    ${iniciales}
                                </div>
                                <span class="font-semibold text-on-surface">${nombreEmpleado}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-on-surface-variant font-medium truncate max-w-[320px] align-middle" title="${mov.concepto}">${mov.concepto}</td>
                        <td class="px-6 py-4 font-bold text-right align-middle ${colorMonto}">${signoMonto}${parseFloat(mov.monto || 0).toLocaleString('es-AR')}</td>
                        <td class="px-6 py-4 text-center align-middle">${tipoBadge}</td>
                    </tr>`;
                });
            }
        } catch (error) {
            console.error("Error al cargar datos del dashboard:", error);
            if (kpiUltimasCajas) {
                kpiUltimasCajas.innerHTML = `<tr><td colspan="5" class="px-6 py-6 text-center text-error font-medium">Error al conectar con el servidor para obtener métricas.</td></tr>`;
            }
        }
    }

    if (btnRefrescar) {
        btnRefrescar.addEventListener('click', () => {
            cargarDashboardDesdeAPI();
            if (window.mostrarNotificacion) window.mostrarNotificacion("Métricas actualizadas en tiempo real.");
        });
    }

    cargarDashboardDesdeAPI();
})();
