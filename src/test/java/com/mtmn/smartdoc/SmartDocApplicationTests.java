package com.mtmn.smartdoc;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.concurrent.CountDownLatch;

@SpringBootTest
class SmartDocApplicationTests {

    @Test
    void contextLoads() {
    }


    static ThreadLocal<String> threadLocal = new ThreadLocal<>();

    public static void main(String[] args) {
        new Thread(() -> {
            String name = Thread.currentThread().getName();
            threadLocal.set("cdd");
            print(name);
            System.out.println(name + "-after remove : " + threadLocal.get());
        }, "t1").start();
        new Thread(() -> {
            String name = Thread.currentThread().getName();
            threadLocal.set("mtmn");
            print(name);
            System.out.println(name + "-after remove : " + threadLocal.get());
        }, "t2").start();
    }

    static void print(String str) {
        // 打印当前线程中本地内存中本地变量的值
        System.out.println(str + " : " + threadLocal.get());
        // 清除本地内存中的本地变量
        threadLocal.remove();
    }
}