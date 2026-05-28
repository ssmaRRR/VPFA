package com.vpfa.app.api

import retrofit2.http.*

interface ApiService {

    // --- AUTENTIFICARE ---
    @FormUrlEncoded
    @POST("api/auth/login")
    suspend fun login(
        @Field("username") email: String,
        @Field("password") password: String
    ): LoginResponse

    @POST("api/auth/register")
    suspend fun register(
        @Body request: UserRegisterRequest
    ): User

    @GET("api/auth/me")
    suspend fun getProfile(): User

    @PUT("api/auth/me")
    suspend fun updateProfile(
        @Body request: UserUpdateRequest
    ): User

    // --- TRANZACȚII ---
    @GET("api/transactions/")
    suspend fun getTransactions(
        @Query("tip") tip: String? = null,
        @Query("categorie") categorie: String? = null,
        @Query("cautare") cautare: String? = null
    ): List<Transaction>

    @POST("api/transactions/")
    suspend fun createTransaction(
        @Body request: TransactionCreateRequest
    ): Transaction

    @DELETE("api/transactions/{id}")
    suspend fun deleteTransaction(
        @Path("id") id: Int
    )

    @GET("api/transactions/dashboard-summary")
    suspend fun getDashboardSummary(): DashboardSummary

    @GET("api/transactions/monthly-trends")
    suspend fun getMonthlyTrends(): List<MonthlyTrend>

    @POST("api/transactions/mock-sync")
    suspend fun syncMockData(): MessageResponse

    @GET("api/transactions/subscriptions/upcoming")
    suspend fun getUpcomingSubscriptions(): List<UpcomingSubscription>

    // --- MACHINE LEARNING ---
    @GET("api/ml/forecast")
    suspend fun getForecast(): ForecastResponse

    @GET("api/ml/investments")
    suspend fun getInvestments(): InvestmentResponse

    @POST("api/ml/trigger-anomalies")
    suspend fun triggerAnomalyDetection(): MessageResponse
}
