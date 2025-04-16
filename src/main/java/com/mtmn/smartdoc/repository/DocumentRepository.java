package com.mtmn.smartdoc.repository;

import com.mtmn.smartdoc.entity.Document;
import com.mtmn.smartdoc.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    
    List<Document> findByUser(User user);
    
    List<Document> findByUserOrderByCreatedAtDesc(User user);
    
    boolean existsByIdAndUser(Long id, User user);
}