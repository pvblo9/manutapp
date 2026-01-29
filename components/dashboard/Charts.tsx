"use client"

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const COLORS = ["#6d151e", "#5a1119", "#470d13", "#3b82f6", "#8b5cf6"]

interface ChartsProps {
  osByTechnician: { name: string; count: number }[]
  costsBySector: { name: string; value: number }[]
  monthlyEvolution: { month: string; gastos: number; budget: number }[]
  osByType: { name: string; count: number }[]
}

export function Charts({
  osByTechnician,
  costsBySector,
  monthlyEvolution,
  osByType,
}: ChartsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* OS por Operador */}
      <div className="card-glass">
        <h3 className="font-display font-bold text-lg text-gray-900 mb-4">
          OS Finalizadas por Operador
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={osByTechnician}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
              }}
              formatter={(value: number | undefined) => [value ?? 0, "Quantidade"]}
            />
            <Legend />
            <Bar dataKey="count" name="Quantidade" fill="#6d151e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Distribuição de Custos por Setor */}
      <div className="card-glass">
        <h3 className="font-display font-bold text-lg text-gray-900 mb-4">
          Custos por Setor
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={costsBySector}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {costsBySector.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Evolução Mensal */}
      <div className="card-glass">
        <h3 className="font-display font-bold text-lg text-gray-900 mb-4">
          Evolução Mensal: Gastos vs Budget
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyEvolution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="gastos"
              stroke="#ef4444"
              name="Gastos"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="budget"
              stroke="#22c55e"
              name="Budget"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* OS por Tipo */}
      <div className="card-glass">
        <h3 className="font-display font-bold text-lg text-gray-900 mb-4">
          OS por Tipo de Manutenção
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={osByType}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
              }}
              formatter={(value: number | undefined) => [value ?? 0, "Quantidade"]}
            />
            <Legend />
            <Bar dataKey="count" name="Quantidade" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
