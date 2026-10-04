package com.example.wallet.repository;

import com.example.wallet.entity.User;
import com.example.wallet.enums.Role;
import com.example.wallet.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUserNumber(String userNumber);
    boolean existsByEmail(String email);
    boolean existsByUserNumber(String userNumber);
    long countByStatus(UserStatus status);
    long countByRole(Role role);

    @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:identifier) OR u.userNumber = :identifier")
    Optional<User> findByEmailOrUserNumber(@Param("identifier") String identifier);

    @Query("SELECT u FROM User u WHERE " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "u.userNumber LIKE CONCAT('%', :query, '%')")
    Page<User> searchUsers(@Param("query") String query, Pageable pageable);
}
