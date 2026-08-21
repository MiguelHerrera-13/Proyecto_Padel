(function() {
    console.log("Controlador de Dashboard (MVP Memoria) Iniciado");

    function cargarDashboardLocal() {
        const movimientos = window.Almacenamiento.obtenerMovimientosCaja();
        const productos = window.Almacenamiento.obtenerProductos();
        const usuarios = window.Almacenamiento.obtenerUsuarios();
        const turnos = window.Almacenamiento.obtenerTurnos();

        // 1. Calcular Ingresos Totales Reales (Efectivo + Digital)
        const ingresosTotales = movimientos
            .filter(m => m.tipo === 'INGRESO' || m.tipo === 'INGRESO_MP')
            .reduce((acc, m) => acc + parseFloat(m.monto), 0);
        
        const kpiIngresos = document.getElementById('kpi-ingresos');
        if (kpiIngresos) kpiIngresos.textContent = `$${ingresosTotales.toLocaleString('es-AR')}`;

        // 2. Calcular Ocupación (Basado en turnos activos del día)
        // Calculamos sobre un máximo teórico de 45 horas por día (3 canchas x 15 horas)
        let horasOcupadas = 0;
        turnos.filter(t => t.estado !== 'FINALIZADO').forEach(t => {
            horasOcupadas += (t.duracion / 60);
        });
        const ocupacion = Math.min(100, Math.round((horasOcupadas / 45) * 100)) || 0;
        
        const kpiOcupacion = document.getElementById('kpi-ocupacion');
        const kpiOcupacionTxt = document.getElementById('kpi-ocupacion-txt');
        const kpiOcupacionCircle = document.getElementById('kpi-ocupacion-circle');
        
        if (kpiOcupacion) kpiOcupacion.textContent = `${ocupacion}%`;
        if (kpiOcupacionTxt) kpiOcupacionTxt.textContent = `${ocupacion}%`;
        if (kpiOcupacionCircle) kpiOcupacionCircle.setAttribute('stroke-dasharray', `${ocupacion}, 100`);

        // 3. Cantidad de Clientes Registrados
        const totalClientes = usuarios.filter(u => u.rol === 'CLIENTE').length;
        const kpiClientes = document.getElementById('kpi-clientes');
        if (kpiClientes) kpiClientes.textContent = totalClientes;

        // 4. Alertas de Stock Reales (Productos con stock <= 5)
        const alertasStock = productos.filter(p => parseInt(p.stockActual || p.stock_actual) <= 5).length;
        const kpiStock = document.getElementById('kpi-stock');
        if (kpiStock) kpiStock.textContent = alertasStock;

        // 5. Renderizar Últimos Movimientos en la Tabla
        const kpiUltimasCajas = document.getElementById('kpi-ultimas-cajas');
        if (kpiUltimasCajas) {
            kpiUltimasCajas.innerHTML = '';
            // Tomamos los últimos 8 movimientos para llenar mejor la tabla
            const ultimosMovs = [...movimientos].reverse().slice(0, 8);

            if (ultimosMovs.length === 0) {
                kpiUltimasCajas.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-on-surface-variant font-medium">No hay movimientos registrados en la caja hoy.</td></tr>`;
                return;
            }

            ultimosMovs.forEach(mov => {
                const isIngreso = (mov.tipo === 'INGRESO' || mov.tipo === 'INGRESO_MP');
                const tipoBadge = isIngreso ? 
                    `<span class="inline-flex items-center gap-1 bg-primary-container/20 text-primary text-xs font-semibold px-2 py-1 rounded-md">INGRESO</span>` : 
                    `<span class="inline-flex items-center gap-1 bg-error-container/20 text-error text-xs font-semibold px-2 py-1 rounded-md">EGRESO</span>`;
                
                const colorMonto = isIngreso ? "text-primary" : "text-error";
                const signoMonto = isIngreso ? "+$" : "-$";
                
                // Extraer iniciales del usuario
                const initials = mov.usuario_nombre ? mov.usuario_nombre.substring(0,2).toUpperCase() : "EM";

                // Formatear solo la hora si es de hoy
                let horaStr = mov.fechaHora ? new Date(mov.fechaHora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Ahora";

                kpiUltimasCajas.innerHTML += `
                <tr class="hover:bg-surface-container-low/50 transition-colors border-b border-surface-container-high/30 last:border-0">
                    <td class="px-6 py-4 font-medium text-on-surface">${horaStr} hrs</td>
                    <td class="px-6 py-4 flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-surface-variant text-on-surface flex items-center justify-center text-[10px] font-bold">
                            ${initials}
                        </div>
                        ${mov.usuario_nombre || "Empleado"}
                    </td>
                    <td class="px-6 py-4 text-on-surface-variant truncate max-w-[250px]" title="${mov.concepto}">${mov.concepto}</td>
                    <td class="px-6 py-4 font-bold ${colorMonto}">${signoMonto}${parseFloat(mov.monto).toLocaleString('es-AR')}</td>
                    <td class="px-6 py-4 text-right">${tipoBadge}</td>
                </tr>`;
            });
        }
    }

    cargarDashboardLocal();
})();