package com.vpfa.app.api

import com.google.gson.annotations.SerializedName

// User DTOs
data class User(
    val id: Int,
    val nume: String,
    val email: String,
    val varsta: Int,
    @SerializedName("venit_lunar") val venitLunar: Double,
    @SerializedName("toleranta_risc") val tolerantaRisc: String,
    @SerializedName("obiectiv_economii") val obiectivEconomii: Double
)

data class UserRegisterRequest(
    val nume: String,
    val email: String,
    val parola: String,
    val varsta: Int,
    @SerializedName("venit_lunar") val venitLunar: Double,
    @SerializedName("toleranta_risc") val tolerantaRisc: String = "Moderat",
    @SerializedName("obiectiv_economii") val obiectivEconomii: Double = 0.0
)

data class UserUpdateRequest(
    val varsta: Int,
    @SerializedName("venit_lunar") val venitLunar: Double,
    @SerializedName("toleranta_risc") val tolerantaRisc: String,
    @SerializedName("obiectiv_economii") val obiectivEconomii: Double
)

data class LoginResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String
)

// Dashboard DTOs
data class DashboardSummary(
    @SerializedName("sold_curent") val soldCurent: Double,
    @SerializedName("venituri_totale") val venituriTotale: Double,
    @SerializedName("cheltuieli_totale") val cheltuieliTotale: Double,
    @SerializedName("rata_economisire") val rataEconomisire: Double,
    @SerializedName("alerte_anomalii") val alerteAnomalii: Int
)

data class MonthlyTrend(
    val luna: String,
    val venituri: Double,
    val cheltuieli: Double
)

data class Transaction(
    val id: Int,
    val suma: Double,
    val tip: String, // "venit" sau "cheltuiala"
    val categorie: String,
    val descriere: String,
    val data: String,
    @SerializedName("este_anomala") val esteAnomala: Boolean
)

data class TransactionCreateRequest(
    val suma: Double,
    val tip: String, // "venit" sau "cheltuiala"
    val categorie: String,
    val descriere: String,
    val data: String
)

data class UpcomingSubscription(
    val id: Int,
    val nume: String,
    val suma: Double,
    @SerializedName("zi_plata") val ziPlata: Int
)

// ML & Forecast DTOs
data class HistoricalPoint(
    val data: String,
    @SerializedName("sold_estimat") val soldEstimat: Double
)

data class ForecastPoint(
    val data: String,
    @SerializedName("sold_estimat") val soldEstimat: Double
)

data class ForecastResponse(
    @SerializedName("runway_luni") val runwayLuni: Double?,
    @SerializedName("mesaj_sanatate") val mesajSanatate: String,
    val istoric: List<HistoricalPoint>,
    val predictie: List<ForecastPoint>
)

// ML & K-Means DTOs
data class AssetAllocation(
    @SerializedName("clasa_active") val clasaActive: String,
    val procent: Double,
    @SerializedName("valoare_estimata") val valoareEstimata: Double
)

data class InvestmentResponse(
    val cluster: Int,
    @SerializedName("profil_nume") val profilNume: String,
    val descriere: String,
    val alocare: List<AssetAllocation>,
    @SerializedName("recomandare_detaliata") val recomandareDetaliata: String
)

data class MessageResponse(
    val message: String
)
